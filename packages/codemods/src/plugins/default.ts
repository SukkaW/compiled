import type { JSXAttribute } from 'jscodeshift';

import type { CodemodPlugin } from './types';

const defaultCodemodPlugin: CodemodPlugin = {
  create: (_, { jscodeshift: j }) => ({
    transform: {
      buildAttributes({ originalNode, transformedNode, composedNode }) {
        const newDeclaration = j(originalNode).replaceWith(transformedNode).get();

        if (composedNode) {
          let candidateForInsertion = newDeclaration;

          while (candidateForInsertion.parentPath?.name !== 'body') {
            candidateForInsertion = candidateForInsertion.parentPath;
          }

          j(candidateForInsertion).insertBefore(composedNode);
        }

        return newDeclaration;
      },

      buildImport({ compiledImportPath, currentNode, specifiers }) {
        const newImport = j.importDeclaration(specifiers, j.literal(compiledImportPath));

        // Copy the comments from the previous import to the new one
        newImport.comments = currentNode.comments;

        return newImport;
      },

      buildRefAttribute({ currentNode }) {
        return j.jsxAttribute(j.jsxIdentifier('ref'), (currentNode as JSXAttribute).value);
      },
    },
  }),
  name: 'default-plugin',
};

export default defaultCodemodPlugin;
