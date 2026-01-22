import { expect } from 'chai';
import { formatLine } from '../src/utils/textUtils';

describe('Formatting Spacing', () => {
    it('should add spaces around operators', () => {
        expect(formatLine('x=1')).to.equal('x = 1');
        // & removed
    });

    it('should handle comparison operators', () => {
        expect(formatLine('If x<=1 Then')).to.equal('If x <= 1 Then');
        expect(formatLine('If x>=1 Then')).to.equal('If x >= 1 Then');
        expect(formatLine('If x<>1 Then')).to.equal('If x <> 1 Then');
        expect(formatLine('If x=1 Then')).to.equal('If x = 1 Then');
        // < and > removed
    });

    it('should handle commas', () => {
        expect(formatLine('Function(a,b,c)')).to.equal('Function(a, b, c)');
    });

    it('should respect strings', () => {
        expect(formatLine('s = "x=1"')).to.equal('s = "x=1"');
        expect(formatLine('Print "Hello,World"')).to.equal('Print "Hello,World"');
        expect(formatLine('s = "He said ""Hello"""')).to.equal('s = "He said ""Hello"""'); // Escaped quotes
    });

    it('should handle complex lines', () => {
        expect(formatLine('If x=1 And y<=2 Then')).to.equal('If x = 1 And y <= 2 Then');
    });

    it('should handle assignment operators', () => {
        expect(formatLine('x+=1')).to.equal('x += 1');
        expect(formatLine('x-=1')).to.equal('x -= 1');
        expect(formatLine('x&=1')).to.equal('x &= 1');
        expect(formatLine('x\\=1')).to.equal('x \\= 1');
        expect(formatLine('Call(x:=1)')).to.equal('Call(x := 1)');
    });

    it('should NOT format unsafe operators', () => {
        expect(formatLine('x&y')).to.equal('x&y');
        expect(formatLine('Dim x&')).to.equal('Dim x&'); // Type char
        expect(formatLine('x<y')).to.equal('x<y');
        expect(formatLine('<div>')).to.equal('<div>');
        expect(formatLine('&HFF')).to.equal('&HFF');
    });
});
