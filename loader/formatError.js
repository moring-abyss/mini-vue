const { generateCodeFrame } = require("@vue/compiler-sfc");

function formatError(
    err,
    source,
    file
) {
    const loc = err.loc
    if (!loc) {
        return
    }
    const locString = `:${loc.start.line}:${loc.start.column}`
    const filePath = chalk.gray(`at ${file}${locString}`)
    const codeframe = generateCodeFrame(source, loc.start.offset, loc.end.offset)
    err.message = `\nVueCompilerError: ${err.message}\n`
}

exports.formatError = formatError