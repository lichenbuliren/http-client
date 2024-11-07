import { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest', // Use ts-jest for TypeScript files
    '^.+\\.[jt]sx?$': 'babel-jest', // Use babel-jest for JavaScript files
  },
  transformIgnorePatterns: [
    '/node_modules/', // Transpile specific ESM modules in node_modules
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

export default config;
