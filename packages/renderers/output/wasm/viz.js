import { instance } from '@viz-js/viz';

let vizPromise;

async function loadViz() {
  if (!vizPromise) {
    vizPromise = instance();
  }
  return vizPromise;
}

export default async function VizModule() {
  const viz = await loadViz();

  return {
    cwrap(name) {
      switch (name) {
        case 'gv_version':
          return () => viz.graphvizVersion;
        case 'gv_get_engines':
          return () => JSON.stringify(viz.engines);
        case 'gv_get_formats':
          return () => JSON.stringify(viz.formats);
        case 'gv_render':
          return (input, optionsJson) => {
            const options = parseJson(optionsJson);
            return JSON.stringify(
              viz.render(input, {
                format: options.format ?? 'svg',
                engine: options.engine ?? 'dot',
                yInvert: options.yInvert,
                reduce: options.reduce,
                graphAttributes: options.graphAttributes,
                nodeAttributes: options.nodeAttributes,
                edgeAttributes: options.edgeAttributes,
                images: options.images,
              })
            );
          };
        case 'gv_render_formats':
          return (input, formatsJson, optionsJson) => {
            const formats = parseJson(formatsJson, []);
            const options = parseJson(optionsJson);
            return JSON.stringify(
              viz.renderFormats(input, formats, {
                engine: options.engine ?? 'dot',
                yInvert: options.yInvert,
                reduce: options.reduce,
                graphAttributes: options.graphAttributes,
                nodeAttributes: options.nodeAttributes,
                edgeAttributes: options.edgeAttributes,
                images: options.images,
              })
            );
          };
        default:
          return () => {
            throw new Error(`Unsupported Graphviz export: ${name}`);
          };
      }
    },
  };
}

function parseJson(input, fallback = {}) {
  if (typeof input !== 'string' || input.length === 0) {
    return fallback;
  }

  try {
    return JSON.parse(input);
  } catch {
    return fallback;
  }
}
