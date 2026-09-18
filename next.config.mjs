/** @type {import('next').NextConfig} */

/**
 * Export estático para o GitHub Pages.
 *
 * Consequências que valem lembrar antes de escrever qualquer tela:
 * - não existe route handler, middleware, SSR nem revalidação. Tudo é cliente.
 * - rotas dinâmicas de segmento (`casos/[id]`) exigiriam generateStaticParams com
 *   ids conhecidos em build. Como os casos são dados de cliente, use query string:
 *   `/casos?id=abc123`. É a regra do projeto.
 * - `next/image` não tem otimizador em runtime: `unoptimized: true`.
 * - o backend são as Cloud Functions, em outra origem. Ver src/lib/api.js.
 *
 * NEXT_PUBLIC_BASE_PATH: vazio para domínio próprio; "/juridico-ia" quando o site
 * for publicado em https://<usuario>.github.io/juridico-ia.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
    output: "export",
    basePath,
    assetPrefix: basePath || undefined,
    trailingSlash: true,
    images: { unoptimized: true },
    poweredByHeader: false,
    reactStrictMode: true,
    eslint: { ignoreDuringBuilds: true }
};

export default nextConfig;
