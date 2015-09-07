/// <reference path="../lib/lib1.d.ts" />
import lib1 = require('../lib/lib1');
import lib2 = require('../lib/lib2');
console.log('sample4-use-lib-ts');
new lib1.Lib1Sample('from sample4-use-lib-ts');
new lib2.Lib2Sample('from sample4-use-lib-ts');
