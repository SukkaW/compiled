import type {
  API,
  FileInfo,
  JSXAttribute,
  JSXSpreadAttribute,
  Options,
  Program,
} from 'jscodeshift';

import defaultCodemodPlugin from '../../plugins/default';
import type { CodemodPluginInstance } from '../../plugins/types';
import { withPlugin, applyVisitor } from '../../utils';

const applyInnerRefPlugin = (plugins: CodemodPluginInstance[], originalNode: JSXAttribute) =>
  plugins.reduce((currentNode, plugin) => {
    const buildRefAttributeImpl = plugin.transform?.buildRefAttribute;
    if (!buildRefAttributeImpl) {
      return currentNode;
    }

    return buildRefAttributeImpl({ currentNode, originalNode });
  }, originalNode as JSXAttribute | JSXSpreadAttribute);

const transformer = (fileInfo: FileInfo, api: API, options: Options): string => {
  const { source } = fileInfo;
  const { jscodeshift: j } = api;
  const collection = j(source);
  const plugins: CodemodPluginInstance[] = [defaultCodemodPlugin, ...options.normalizedPlugins].map(
    (plugin) => plugin.create(fileInfo, api, options)
  );

  const originalProgram: Program = j(source).find(j.Program).get();

  collection
    .find(j.JSXAttribute, (node) => node.name.name === 'innerRef')
    .forEach((innerRefProp) => {
      const newRefAttr = applyInnerRefPlugin(plugins, innerRefProp.value);

      j(innerRefProp).replaceWith(newRefAttr);
    });

  applyVisitor({
    currentProgram: collection.find(j.Program).get(),
    originalProgram,
    plugins,
  });

  return collection.toSource(options.printOptions || { quote: 'single' });
};

export default withPlugin(transformer);
