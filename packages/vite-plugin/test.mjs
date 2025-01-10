import { createFilter } from '@rollup/pluginutils';

import { minimatch } from 'minimatch';

console.log(createFilter('*.js')('foo.js'));

console.log(minimatch('x.vue?vue&', '**/*.vue\\?vue&*'));
