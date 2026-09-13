import test from 'node:test';import assert from 'node:assert/strict';import {gameKey} from '../src/controls.js';
test('Japanese IME and Shift preserve physical movement keys',()=>{
 assert.equal(gameKey({code:'KeyW',key:'Process'}),'w');assert.equal(gameKey({code:'KeyA',key:'ち'}),'a');assert.equal(gameKey({code:'KeyD',key:'D'}),'d');assert.equal(gameKey({code:'ArrowUp',key:'ArrowUp'}),'arrowup');assert.equal(gameKey({key:'Escape'}),'escape');
});
