const qs= require('querystring');
const loaderUtils = require('loader-utils');
const { formatError } = require('./formatError')
const { getDescriptor } = require('./descriptorCache')
const { resolveScript } = require('./resolveScript')
const { resolveTemplateTSOptions } = require('./util')
const { compileTemplate } = require('@vue/compiler-sfc')

// Loader that compiles raw template into JavaScript functions.
// This is injected by the global pitcher (../pitch) for template
// selection requests initiated from vue files.
const TemplateLoader = function (source, inMap) {
    source = String(source)
    const loaderContext = this

    // although this is not the main vue-loader, we can get access to the same
    // vue-loader options because we've set an ident in the plugin and used that
    // ident to create the request for this loader in the pitcher.
    const options = (loaderUtils.getOptions(loaderContext) ||
        {})

    const isServer = options.isServerBuild ?? loaderContext.target === 'node'
    const isProd =
        loaderContext.mode === 'production' || process.env.NODE_ENV === 'production'
    const query = qs.parse(loaderContext.resourceQuery.slice(1))
    const scopeId = query.id
    const descriptor = getDescriptor(loaderContext.resourcePath)
    const script = resolveScript(
        descriptor,
        query.id,
        options,
        loaderContext
)

    let templateCompiler
    if (typeof options.compiler === 'string') {
        templateCompiler = require(options.compiler)
    } else {
        templateCompiler = options.compiler
    }

    const compiled = compileTemplate({
        source,
        filename: loaderContext.resourcePath,
        inMap,
        id: scopeId,
        scoped: !!query.scoped,
        slotted: descriptor.slotted,
        isProd,
        ssr: isServer,
        ssrCssVars: descriptor.cssVars,
        compiler: templateCompiler,
        compilerOptions: {
            ...options.compilerOptions,
            scopeId: query.scoped ? `data-v-${scopeId}` : undefined,
            bindingMetadata: script ? script.bindings : undefined,
            ...resolveTemplateTSOptions(descriptor, options),
        },
        transformAssetUrls: options.transformAssetUrls || true,
    })

    // tips
    if (compiled.tips.length) {
        compiled.tips.forEach((tip) => {
            loaderContext.emitWarning(tip)
        })
    }

    // errors
    if (compiled.errors && compiled.errors.length) {
        compiled.errors.forEach((err) => {
            if (typeof err === 'string') {
                loaderContext.emitError(err)
            } else {
                formatError(
                    err,
                    inMap ? inMap.sourcesContent[0] : (source),
                loaderContext.resourcePath
            )
                loaderContext.emitError(err)
            }
        })
    }

    const { code, map } = compiled
    loaderContext.callback(null, code, map)
}

module.exports = TemplateLoader
