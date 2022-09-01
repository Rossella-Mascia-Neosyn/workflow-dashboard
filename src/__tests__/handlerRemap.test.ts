import { handlerRemap } from '../myUtils/handlerRemap';
//initJson
import baseInit from './jsonTest/init/baseInit.json';
import childrenInit from './jsonTest/init/childrenInit.json';
import moreComplexInit from './jsonTest/init/moreComplexInit.json';
//resultJson
import baseResult from './jsonTest/result/baseResult.json';
import childrenResult from './jsonTest/result/childrenResult.json';
import moreComplexResult from './jsonTest/result/moreComplexResult.json';

test('simple data', () => {
    expect(handlerRemap(baseInit)).toEqual(baseResult)
});

test('children nested states data', () => {
    expect(handlerRemap(childrenInit)).toEqual(childrenResult)
});

test('more complex data', () => {
    expect(handlerRemap(moreComplexInit)).toEqual(moreComplexResult)
});