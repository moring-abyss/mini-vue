
const StyleInineLoader = function (source) {
    // TODO minify this?
    return `export default ${JSON.stringify(source)}`
}

module.exports =  StyleInineLoader
