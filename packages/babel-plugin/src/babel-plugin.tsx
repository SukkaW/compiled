import { basename } from 'path';

import { declare } from '@babel/helper-plugin-utils';
import jsxSyntax from '@babel/plugin-syntax-jsx';
import template from '@babel/template';
import * as t from '@babel/types';
import { unique } from '@compiled/utils';

import { visitClassNamesPath } from './class-names';
import { visitCssPropPath } from './css-prop';
import { visitStyledPath } from './styled';
import type { State } from './types';
import { appendRuntimeImports } from './utils/append-runtime-imports';
import { Cache } from './utils/cache';
import {
  isCompiledCSSCallExpression,
  isCompiledCSSTaggedTemplateExpression,
  isCompiledKeyframesCallExpression,
  isCompiledKeyframesTaggedTemplateExpression,
  isCompiledStyledCallExpression,
  isCompiledStyledTaggedTemplateExpression,
} from './utils/is-compiled';
import { preserveLeadingComments } from './utils/preserve-leading-comments';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');
const JSX_SOURCE_ANNOTATION_REGEX = /\*?\s*@jsxImportSource\s+([^\s]+)/;
const JSX_ANNOTATION_REGEX = /\*?\s*@jsx\s+([^\s]+)/;
const COMPILED_MODULE = '@compiled/react';

let globalCache: Cache | undefined;

export default declare<State>((api) => {
  api.assertVersion(7);

  return {
    inherits: jsxSyntax,
    name: packageJson.name,
    pre() {
      this.sheets = {};
      let cache: Cache;

      if (this.opts.cache === true) {
        globalCache = new Cache();
        cache = globalCache;
      } else {
        cache = new Cache();
      }

      cache.initialize({ ...this.opts, cache: !!this.opts.cache });

      this.cache = cache;
      this.includedFiles = [];
      this.pathsToCleanup = [];
      this.pragma = {};
    },
    visitor: {
      CallExpression(path, state) {
        if (
          isCompiledCSSCallExpression(path.node, state) ||
          isCompiledKeyframesCallExpression(path.node, state)
        ) {
          state.pathsToCleanup.push({ action: 'replace', path });
          return;
        }

        if (isCompiledStyledCallExpression(path.node, state)) {
          visitStyledPath(path, { context: 'root', parentPath: path, state });
          return;
        }
      },
      ImportDeclaration(path, state) {
        if (path.node.source.value !== COMPILED_MODULE) {
          return;
        }

        // The presence of the module enables CSS prop
        state.compiledImports = state.compiledImports || {};

        // Go through each import and enable each found API
        path.get('specifiers').forEach((specifier) => {
          if (!state.compiledImports || !specifier.isImportSpecifier()) {
            // Bail out early
            return;
          }

          (['styled', 'ClassNames', 'css', 'keyframes'] as const).forEach((apiName) => {
            if (
              state.compiledImports &&
              t.isIdentifier(specifier.node?.imported) &&
              specifier.node?.imported.name === apiName
            ) {
              // Enable the API with the local name
              state.compiledImports[apiName] = specifier.node.local.name;
              specifier.remove();
            }
          });
        });

        if (path.node.specifiers.length === 0) {
          path.remove();
        }
      },
      JSXElement(path, state) {
        if (!state.compiledImports?.ClassNames) {
          return;
        }

        visitClassNamesPath(path, { context: 'root', parentPath: path, state });
      },
      JSXOpeningElement(path, state) {
        if (!state.compiledImports) {
          return;
        }

        visitCssPropPath(path, { context: 'root', parentPath: path, state });
      },
      Program: {
        enter(_, state) {
          const { file } = state;

          if (file.ast.comments) {
            for (const comment of file.ast.comments) {
              const jsxSourceMatches = JSX_SOURCE_ANNOTATION_REGEX.exec(comment.value);
              const jsxMatches = JSX_ANNOTATION_REGEX.exec(comment.value);

              if (jsxSourceMatches && jsxSourceMatches[1] === COMPILED_MODULE) {
                // jsxImportSource pragma found - turn on CSS prop!
                state.compiledImports = {};
                state.pragma.jsxImportSource = true;
              }

              if (jsxMatches && jsxMatches[1] === 'jsx') {
                state.pragma.jsx = true;
              }
            }
          }
        },
        exit(path, state) {
          if (!state.compiledImports) {
            return;
          }

          const {
            pragma,
            opts: { importReact: shouldImportReact = true },
          } = state;

          preserveLeadingComments(path);

          appendRuntimeImports(path);

          const hasPragma = pragma.jsxImportSource || pragma.jsx;

          if (!hasPragma && shouldImportReact && !path.scope.getBinding('React')) {
            // React is missing - add it in at the last moment!
            path.unshiftContainer('body', template.ast(`import * as React from 'react'`));
          }

          if (state.compiledImports.styled && !path.scope.getBinding('forwardRef')) {
            // forwardRef is missing - add it in at the last moment!
            path.unshiftContainer('body', template.ast(`import { forwardRef } from 'react'`));
          }

          const filename = basename(state.filename ?? '') || 'File';
          const version = process.env.TEST_PKG_VERSION || packageJson.version;

          path.addComment('leading', ` ${filename} generated by ${packageJson.name} v${version} `);

          // Add a line break after the comment
          path.unshiftContainer('body', t.noop());

          // Callback when included files have been added.
          if (this.includedFiles.length && this.opts.onIncludedFiles) {
            this.opts.onIncludedFiles(unique(this.includedFiles));
          }

          // Cleanup paths that have been marked.
          state.pathsToCleanup.forEach((clean) => {
            switch (clean.action) {
              case 'remove': {
                clean.path.remove();
                return;
              }

              case 'replace': {
                clean.path.replaceWith(t.nullLiteral());
                return;
              }

              default:
                return;
            }
          });
        },
      },
      TaggedTemplateExpression(path, state) {
        if (
          isCompiledCSSTaggedTemplateExpression(path.node, state) ||
          isCompiledKeyframesTaggedTemplateExpression(path.node, state)
        ) {
          state.pathsToCleanup.push({ action: 'replace', path });
          return;
        }

        if (isCompiledStyledTaggedTemplateExpression(path.node, state)) {
          visitStyledPath(path, { context: 'root', parentPath: path, state });
          return;
        }
      },
    },
  };
});
