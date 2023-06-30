const { resolveTemplateTSOptions } = require('./util');
const { compileScript } = require('@vue/compiler-sfc');

const clientCache = new WeakMap()
const serverCache = new WeakMap()

/**
 * inline template mode can only be enabled if:
 * - is production (separate compilation needed for HMR during dev)
 * - template has no pre-processor (separate loader chain required)
 * - template is not using src
 */

function canInlineTemplate(descriptor, isProd) {
    const templateLang = descriptor.template && descriptor.template.lang
    const templateSrc = descriptor.template && descriptor.template.src
    return isProd && !!descriptor.scriptSetup && !templateLang && !templateSrc
}

function resolveScript(
    descriptor,
    scopeId,
    options,
    loaderContext
) {
    if (!descriptor.script && !descriptor.scriptSetup) {
        return null
    }

    const isProd =
        loaderContext.mode === 'production' || process.env.NODE_ENV === 'production'
    const isServer = options.isServerBuild ?? loaderContext.target === 'node'
    const enableInline = canInlineTemplate(descriptor, isProd)

    const cacheToUse = isServer ? serverCache : clientCache
    const cached = cacheToUse.get(descriptor)
    if (cached) {
        return cached
    }

    let resolved = null

    let templateCompiler
    if (typeof options.compiler === 'string') {
        templateCompiler = require(options.compiler)
    } else {
        templateCompiler = options.compiler
    }

    try {
        resolved = compileScript(descriptor, {
            id: scopeId,
            isProd,
            inlineTemplate: enableInline,
            reactivityTransform: options.reactivityTransform,
            babelParserPlugins: options.babelParserPlugins,
            templateOptions: {
                ssr: isServer,
                compiler: templateCompiler,
                compilerOptions: {
                    ...options.compilerOptions,
                    ...resolveTemplateTSOptions(descriptor, options),
                },
                transformAssetUrls: options.transformAssetUrls || true,
            },
        })
    } catch (e) {
        loaderContext.emitError(e)
    }

    cacheToUse.set(descriptor, resolved)
    return resolved
}

exports.resolveScript = resolveScript;
exports.canInlineTemplate = canInlineTemplate;