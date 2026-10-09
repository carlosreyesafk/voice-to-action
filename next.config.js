/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  // @xenova/transformers se importa dinámicamente solo en el cliente.
  // Hay que decirle a webpack que ignore onnxruntime-node (bindings nativos
  // del backend Node) porque solo usamos el backend web (WASM).
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-node': false,
    };
    return config;
  },
};

module.exports = nextConfig;
