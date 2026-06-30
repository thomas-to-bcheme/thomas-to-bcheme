#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const BASE62_ZERO = '0';

function getRequiredIntegerLength(head) {
  if (head >= 'a' && head <= 'z') return head.charCodeAt(0) - 'a'.charCodeAt(0) + 2;
  if (head >= 'A' && head <= 'Z') return 'Z'.charCodeAt(0) - head.charCodeAt(0) + 2;
  return -1;
}

function isValidFractionalIndex(key) {
  if (typeof key !== 'string' || key.length === 0) return false;
  const requiredLen = getRequiredIntegerLength(key[0]);
  if (requiredLen < 0 || key.length < requiredLen) return false;
  const fractional = key.slice(requiredLen);
  if (fractional.endsWith(BASE62_ZERO)) return false;
  return true;
}

const filePath = path.resolve(__dirname, '../public/excalidraw/technical_prep.excalidraw');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const seen = new Set();
let stripped = 0;

data.elements = (data.elements ?? []).map((el) => {
  const { index, ...rest } = el;
  if (isValidFractionalIndex(index) && !seen.has(index)) {
    seen.add(index);
    return el;
  }
  stripped++;
  return rest;
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Done. Stripped ${stripped} invalid/duplicate index field(s) from ${data.elements.length} elements.`);
