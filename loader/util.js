function resolveTemplateTSOptions(
    descriptor,
    options
) {
    if (options.enableTsInTemplate === false) return null

    const lang = descriptor.script?.lang || descriptor.scriptSetup?.lang
    const isTS = !!(lang && /tsx?$/.test(lang))
    let expressionPlugins = options?.compilerOptions?.expressionPlugins || []
    if (isTS && !expressionPlugins.includes('typescript')) {
        expressionPlugins = [...expressionPlugins, 'typescript']
    }
    return {
        isTS,
        expressionPlugins,
    }
}

exports.resolveTemplateTSOptions = resolveTemplateTSOptions;
