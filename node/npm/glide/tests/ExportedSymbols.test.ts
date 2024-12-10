import { it } from "@jest/globals";
import * as f from 'fs/promises';
import { describe } from "node:test";
import * as ts from "typescript";
import * as glideApi from "../";

describe("Exported Symbols test", () => {

    it("check excluded symbols are not exported", async () => {

        // Check exported symbols for valkey glide package
        const exportedSymbolsList = Object.keys(glideApi).sort();  // exportedList

        const implBuildFolder = './build-ts/';
        // const rustClientBuildFolder = './node_modules/@valkey/valkey-glide-impl/rust-client/';
        // const filesWithNodeCode = [...await getFiles(implBuildFolder), ...await getFiles(rustClientBuildFolder)];
        const filesWithNodeCode = await getFiles(implBuildFolder);
        console.log(filesWithNodeCode);

        const internallyExported: any = [];

        for (const file of filesWithNodeCode) {
            const sourceCode = await f.readFile(file, 'utf8');
            const sourceFile = await ts.createSourceFile(file, sourceCode, ts.ScriptTarget.Latest, true);
            internallyExported.push(...visitRoot(sourceFile));
        }

        internallyExported.sort();

        let missingSymbols = internallyExported.filter((e: string) => !exportedSymbolsList.includes(e));
        let doesNotExistExports = exportedSymbolsList.filter((e: string | any) => !internallyExported.includes(e));

        console.log("Missing exports=");
        console.log(missingSymbols);
        console.log("Exports does not exist=");
        console.log(doesNotExistExports);
        expect(exportedSymbolsList).toEqual(internallyExported);
    });
});


// function getFiles(folderName: fs.PathLike): string[] {
//     const files = fs.readdirSync(folderName).filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts'));
//     return files;
// }

async function getFiles(folderName: string): Promise<string[]> {
    const files = await f.readdir(folderName, { withFileTypes: true });

    const skipFolders = [
        'commonjs-test',
        'glide-logs',
        'hybrid-node-tests',
        'node_modules',
        'npm',
        '.cargo',
        'target',
        'tests'
    ];

    const filesWithNodeCode = [];

    for (const file of files) {
        if (file.isDirectory()) {
            if (skipFolders.includes(file.name)) {
                continue;
            }

            filesWithNodeCode.push(...(await getFiles(folderName + file.name + '/')));
        } else {
            if (!file.name.endsWith('.d.ts')) {
                continue;
            }
            filesWithNodeCode.push(folderName + file.name);
        }
    }

    return filesWithNodeCode;
}

function visitRoot(root: ts.Node) {
    // (Root Level)->(Level 1)
    const children: ts.Node[] = root.getChildren();

    const resultList: string[] = [];
    // (Root Level) -> (Level 1) -> Level 2. This is the level in the AST where all the exported symbols in a file are present.
    for (const node of children) {
        const nodeList: string[] = node.getChildren().map(c => visit(c)).filter(c => c !== undefined);

        if (nodeList.length > 0) {
            resultList.push(...nodeList);
        }
    }

    return resultList;
}

function visit(node: ts.Node) {
    let name: string | undefined = "";

    // List of exported symbols we want to ignore.
    switch (node.kind) {
        case ts.SyntaxKind.FirstStatement:
        case ts.SyntaxKind.ExportDeclaration:
        case ts.SyntaxKind.ExportAssignment:
        case ts.SyntaxKind.ImportDeclaration:
            return;
    }

    // list exported symbols we want to check for, like, InterfaceDeclaration, FunctionDeclaration, etc.
    if (ts.isFunctionDeclaration(node)) {
        name = node.name?.text;
    } else if (ts.isVariableStatement(node)) {
        name = "";
    } else if (ts.isInterfaceDeclaration(node)) {
        name = node.name?.text;
    } else if (ts.isClassDeclaration(node)) {
        name = node.name?.text;
    } else if (ts.isTypeAliasDeclaration(node)) {
        name = node.name?.text;
    } else if (ts.isEnumDeclaration(node)) {
        name = node.name?.text;
    } else if (ts.isModuleDeclaration(node)) {
        name = node.name?.text;
    }

    const children = node.getChildren();
    const isInternal = children.find(c => (ts.SyntaxKind[c.kind] == "JSDocComment"))?.getText().includes('@internal');
    const isExported = children.find(c => (ts.SyntaxKind[c.kind] == "SyntaxList"))?.getChildren().find(c => (ts.SyntaxKind[c.kind] == "ExportKeyword"));

    if (isExported && !isInternal) {
        // Not internal symbol exported for external use.
        return name;
    }

    if ((isExported && isInternal)) {
        // marked correctly... no-op. Exported for internal use in the code.
    }

    if (!isExported && isInternal) {
        // no-op
    }

    if (!isExported && !isInternal) {
        // no-op
    }
}
