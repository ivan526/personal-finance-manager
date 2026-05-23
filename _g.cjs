var fs = require('fs'); 
var path = require('path'); 
var base = 'C:\workspace\personal-finance-manager'; 
function w(n, c) { var p = path.join(base, n); fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, c, 'utf8'); console.log('Written:', n); } 
ECHO is on.
w('src/utils/storage.test.ts', [ 
  'import { describe, it, expect, beforeEach } from ' + String.fromCharCode(39) + 'vitest' + String.fromCharCode(39) + ';', 
  'import { storage } from ' + String.fromCharCode(39) + '../utils/storage' + String.fromCharCode(39) + ';', 
  'import type { Transaction, Account, Budget, Liability, InvestmentTransaction, Position, FinancialGoal, AssetHistory } from ' + String.fromCharCode(39) + '../types' + String.fromCharCode(39) + ';', 
  '', 
  '  id: ' + String.fromCharCode(39) + 'tx-' + String.fromCharCode(39) + ' + Date.now() + Math.random(),', 
  '  type: ' + String.fromCharCode(39) + 'expense' + String.fromCharCode(39) + ',', 
  '  categoryId: ' + String.fromCharCode(39) + 'food' + String.fromCharCode(39) + ',', 
  '  amount: 100,', 
  '  time: Date.now(),', 
  '  remark: ' + String.fromCharCode(39) + 'test' + String.fromCharCode(39) + ',', 
  '  ...overrides,', 
  '});', 
  '', 
  'describe(' + String.fromCharCode(39) + 'storage - Transactions' + String.fromCharCode(39) + ', () =
  '  it(' + String.fromCharCode(39) + 'should start with empty transactions' + String.fromCharCode(39) + ', () =
  '    expect(storage.getTransactions()).toEqual([]);', 
  '  });', 
  '', 
  '  it(' + String.fromCharCode(39) + 'should add a transaction' + String.fromCharCode(39) + ', () =
  '    const t = tx();', 
