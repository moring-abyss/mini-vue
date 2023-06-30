
const path = require("path");
const loaderUtils = require('loader-utils');
const qs= require('querystring');
const { parse } = require('@vue/compiler-sfc');
const hash = require('hash-sum');
const exportHelperPath = JSON.stringify(require.resolve('./exportHelper'));
const { selectBlock } = require('./select')
const { canInlineTemplate } = require("./resolveScript");
const { getDescriptor, setDescriptor } = require('./descriptorCache')

module.exports = function (source) {
    const loaderContext = this

    const stringifyRequest = (r) =>
        loaderUtils.stringifyRequest(loaderContext, r)

    const {
        mode,
        target,
        sourceMap,
        rootContext,
        resourcePath,
        resourceQuery: _resourceQuery = '',
    } = loaderContext


    const rawQuery = _resourceQuery.slice(1)
    const incomingQuery = qs.parse(rawQuery)
    const resourceQuery = rawQuery ? `&${rawQuery}` : ''
    const options = (this.getOptions() ||
        {})

    const isServer = options.isServerBuild ?? target === 'node'
    const isProduction =
        mode === 'production' || process.env.NODE_ENV === 'production'

    const filename = resourcePath.replace(/\?.*$/, '')
    const { descriptor, errors } = parse(source, {
        filename,
        sourceMap,
    })

    const asCustomElement =
        typeof options.customElement === 'boolean'
            ? options.customElement
            : (options.customElement || /\.ce\.vue$/).test(filename)

    // cache descriptor
    setDescriptor(filename, descriptor)

    if (errors.length) {
        errors.forEach((err) => {
            formatError(err, source, resourcePath)
            loaderContext.emitError(err)
        })
        return ``
    }

    // module id for scoped CSS & hot-reload
    const rawShortFilePath = path
        .relative(rootContext || process.cwd(), filename)
        .replace(/^(\.\.[\/\\])+/, '')
    const shortFilePath = rawShortFilePath.replace(/\\/g, '/')
    const id = hash(
        isProduction
            ? shortFilePath + '\n' + source.replace(/\r\n/g, '\n')
            : shortFilePath
    )

    // if the query has a type field, this is a language block request
    // e.g. foo.vue?type=template&id=xxxxx
    // and we will return early
    if (incomingQuery.type) {
        var rest = selectBlock(
            descriptor,
            id,
            options,
            loaderContext,
            incomingQuery,
            !!options.appendExtension
        )
        return rest
        // return selectBlock(
        //     descriptor,
        //     id,
        //     options,
        //     loaderContext,
        //     incomingQuery,
        //     !!options.appendExtension
        // )
    }

    // feature information
    const hasScoped = descriptor.styles.some((s) => s.scoped)
    const needsHotReload =
        !isServer &&
        !isProduction &&
        !!(descriptor.script || descriptor.scriptSetup || descriptor.template) &&
        options.hotReload !== false

    // extra properties to attach to the script object
    // we need to do this in a tree-shaking friendly manner
    const propsToAttach = []

    // script
    let scriptImport = `const script = {}`
    let isTS = false
    const { script, scriptSetup } = descriptor
    if (script || scriptSetup) {
        const lang = script?.lang || scriptSetup?.lang
        isTS = !!(lang && /tsx?/.test(lang))
        const src = (script && !scriptSetup && script.src) || resourcePath
        const attrsQuery = attrsToQuery((scriptSetup || script).attrs, 'js')
        const query = `?vue&type=script${attrsQuery}${resourceQuery}`
        const scriptRequest = stringifyRequest(src + query)
        scriptImport =
            `import script from ${scriptRequest}\n` +
            // support named exports
            `export * from ${scriptRequest}`
    }

    // template
    let templateImport = ``
    let templateRequest
    const renderFnName = isServer ? `ssrRender` : `render`
    const useInlineTemplate = canInlineTemplate(descriptor, isProduction)
    if (descriptor.template && !useInlineTemplate) {
        const src = descriptor.template.src || resourcePath
        const idQuery = `&id=${id}`
        const scopedQuery = hasScoped ? `&scoped=true` : ``
        const attrsQuery = attrsToQuery(descriptor.template.attrs)
        const tsQuery =
            options.enableTsInTemplate !== false && isTS ? `&ts=true` : ``
        const query = `?vue&type=template${idQuery}${scopedQuery}${tsQuery}${attrsQuery}${resourceQuery}`
        templateRequest = stringifyRequest(src + query)
        templateImport = `import { ${renderFnName} } from ${templateRequest}`
        propsToAttach.push([renderFnName, renderFnName])
    }

    // styles
    let stylesCode = ``
    let hasCSSModules = false
    const nonWhitespaceRE = /\S+/
    if (descriptor.styles.length) {
        descriptor.styles
            .filter((style) => style.src || nonWhitespaceRE.test(style.content))
            .forEach((style, i) => {
                const src = style.src || resourcePath
                const attrsQuery = attrsToQuery(style.attrs, 'css')
                // make sure to only pass id when necessary so that we don't inject
                // duplicate tags when multiple components import the same css file
                const idQuery = !style.src || style.scoped ? `&id=${id}` : ``
                const inlineQuery = asCustomElement ? `&inline` : ``
                const query = `?vue&type=style&index=${i}${idQuery}${inlineQuery}${attrsQuery}${resourceQuery}`
                const styleRequest = stringifyRequest(src + query)
                if (style.module) {
                    if (asCustomElement) {
                        loaderContext.emitError(
                            `<style module> is not supported in custom element mode.`
                        )
                    }
                    if (!hasCSSModules) {
                        stylesCode += `\nconst cssModules = {}`
                        propsToAttach.push([`__cssModules`, `cssModules`])
                        hasCSSModules = true
                    }
                    stylesCode += genCSSModulesCode(
                        id,
                        i,
                        styleRequest,
                        style.module,
                        needsHotReload
                    )
                } else {
                    if (asCustomElement) {
                        stylesCode += `\nimport _style_${i} from ${styleRequest}`
                    } else {
                        stylesCode += `\nimport ${styleRequest}`
                    }
                }
                // TODO SSR critical CSS collection
            })
        if (asCustomElement) {
            propsToAttach.push([
                `styles`,
                `[${descriptor.styles.map((_, i) => `_style_${i}`)}]`,
            ])
        }
    }

    let code = [templateImport, scriptImport, stylesCode]
        .filter(Boolean)
        .join('\n')

    // attach scope Id for runtime use
    if (hasScoped) {
        propsToAttach.push([`__scopeId`, `"data-v-${id}"`])
    }

    // Expose filename. This is used by the devtools and Vue runtime warnings.
    if (!isProduction) {
        // Expose the file's full path in development, so that it can be opened
        // from the devtools.
        propsToAttach.push([
            `__file`,
            JSON.stringify(rawShortFilePath.replace(/\\/g, '/')),
        ])
    }

    // custom blocks
    if (descriptor.customBlocks && descriptor.customBlocks.length) {
        code += `\n/* custom blocks */\n`
        code +=
            descriptor.customBlocks
                .map((block, i) => {
                    const src = block.attrs.src || resourcePath
                    const attrsQuery = attrsToQuery(block.attrs)
                    const blockTypeQuery = `&blockType=${qs.escape(block.type)}`
                    const issuerQuery = block.attrs.src
                        ? `&issuerPath=${qs.escape(resourcePath)}`
                        : ''
                    const query = `?vue&type=custom&index=${i}${blockTypeQuery}${issuerQuery}${attrsQuery}${resourceQuery}`
                    return (
                        `import block${i} from ${stringifyRequest(src + query)}\n` +
                        `if (typeof block${i} === 'function') block${i}(script)`
                    )
                })
                .join(`\n`) + `\n`
    }

    // finalize
    if (!propsToAttach.length) {
        code += `\n\nconst __exports__ = script;`
    } else {
        code += `\n\nimport exportComponent from ${exportHelperPath}`
        code += `\nconst __exports__ = /*#__PURE__*/exportComponent(script, [${propsToAttach
            .map(([key, val]) => `['${key}',${val}]`)
            .join(',')}])`
    }

    // if (needsHotReload) {
    //     code += genHotReloadCode(id, templateRequest)
    // }

    code += `\n\nexport default __exports__`
    return code
}


function attrsToQuery(attrs, langFallback) {
    let query = ``
    for (const name in attrs) {
        const value = attrs[name]
        if (!ignoreList.includes(name)) {
            query += `&${qs.escape(name)}=${value ? qs.escape(String(value)) : ``}`
        }
    }
    if (langFallback && !(`lang` in attrs)) {
        query += `&lang=${langFallback}`
    }
    return query
}