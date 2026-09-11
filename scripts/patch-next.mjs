import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const filesToPatch = [
    path.join(root, "node_modules/next/dist/build/webpack/plugins/next-trace-entrypoints-plugin.js"),
    path.join(root, "node_modules/next/dist/build/collect-build-traces.js")
];

// O patch de EISDIR só é necessário no Windows (onde readlink em arquivo regular gera EISDIR em vez de EINVAL)
if (process.platform === "win32") {
    for (const file of filesToPatch) {
        if (fs.existsSync(file)) {
            let content = fs.readFileSync(file, "utf8");
            const target = "e.code === 'EINVAL' || e.code === 'ENOENT' || e.code === 'UNKNOWN'";
            const replacement = "e.code === 'EINVAL' || e.code === 'ENOENT' || e.code === 'UNKNOWN' || e.code === 'EISDIR'";
            if (content.includes(target) && !content.includes(replacement)) {
                content = content.replaceAll(target, replacement);
                fs.writeFileSync(file, content, "utf8");
                console.log(`[patch-next] Patched Windows EISDIR handling in ${path.basename(file)}`);
            }
        }
    }
}
