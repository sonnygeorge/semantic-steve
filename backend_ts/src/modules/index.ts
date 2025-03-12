import * as fs from 'fs';
import * as path from 'path';
import { FunctionRegistry, SemanticSteveFunction } from '../types';
import { Bot } from 'mineflayer';




export function buildFunctionRegistry(directoryPath: string = __dirname): FunctionRegistry {
  const registry: FunctionRegistry = {};
  
  // Get the current file name and extension
  const currentFile = path.basename(__filename);
  const fileExtension = path.extname(currentFile);
  
  // Get all files with the same extension in the directory
  const files = fs.readdirSync(directoryPath).filter(file => 
    file.endsWith(fileExtension) && 
    file !== currentFile
  );
  
  // Import each file and add its default export to the registry
  for (const file of files) {
    try {
      const modulePath = path.join(directoryPath, file);
      // Dynamic import (returns a Promise)
      const module = require(modulePath);
      const func = module.default as SemanticSteveFunction;
      
      if (func && typeof func === 'function') {
        // Use the filename (without extension) as the key
        const funcName = func.name
        registry[funcName] = func;
      }
    } catch (error) {
      console.error(`Error importing ${file}:`, error);
    }
  }
  
  return registry;
}