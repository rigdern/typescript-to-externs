# typescript-to-externs

A command line tool which converts TypeScript type definition files to externs files for use with the [Google Closure Compiler](https://developers.google.com/closure/compiler/).

A large collection of TypeScript type definition files can be found at [DefinitelyTyped](https://github.com/borisyankov/DefinitelyTyped).

## Usage

- Clone the project:
  ```
  git clone https://github.com/rigdern/typescript-to-externs.git
  ```

- Install the dependencies:
  ```
  cd typescript-to-externs
  npm install
  ```

- Convert a TypeScript type definition file to an externs file:
  ```
  node ./main.js /path/to/type_definition_file.d.ts
  ```

## License

Copyright (c) Microsoft Corporation
