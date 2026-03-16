import { removeComments } from '../src/index';
import { removeHaskellComments } from '../src/removers/other-remover';

describe('Haskell Comment Removal', () => {
  describe('Line comments (--)', () => {
    test('removes -- comments', () => {
      const code = `-- This is a comment
main :: IO ()
main = putStrLn "Hello" -- inline comment`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('main :: IO ()');
      expect(result.code).toContain('putStrLn "Hello"');
      expect(result.code).not.toContain('This is a comment');
      expect(result.code).not.toContain('inline comment');
    });

    test('removes multiple line comments', () => {
      const code = `-- Comment 1
-- Comment 2
x = 5
-- Comment 3`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('x = 5');
      expect(result.code).not.toContain('Comment 1');
      expect(result.code).not.toContain('Comment 2');
      expect(result.code).not.toContain('Comment 3');
    });

    test('preserves operators that look like comments', () => {
      const code = `x --> y = x + y`;
      const result = removeHaskellComments(code);
      expect(result).toContain('-->');
    });
  });

  describe('Block comments ({- -})', () => {
    test('removes {- -} comments', () => {
      const code = `{- This is a
block comment -}
main = putStrLn "Hello"`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('main = putStrLn "Hello"');
      expect(result.code).not.toContain('block comment');
    });

    test('removes inline block comments', () => {
      const code = `x {- comment -} = 5`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('x');
      expect(result.code).toContain('= 5');
      expect(result.code).not.toContain('comment');
    });

    test('handles nested block comments', () => {
      const code = `{- outer {- inner -} still outer -}
main = putStrLn "Hello"`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('main = putStrLn "Hello"');
      expect(result.code).not.toContain('outer');
      expect(result.code).not.toContain('inner');
    });

    test('handles deeply nested block comments', () => {
      const code = `{- level 1 {- level 2 {- level 3 -} back to 2 -} back to 1 -}
x = 42`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('x = 42');
      expect(result.code).not.toContain('level');
    });
  });

  describe('Pragmas ({-# #-})', () => {
    test('preserves language pragmas', () => {
      const code = `{-# LANGUAGE OverloadedStrings #-}
-- A comment
module Main where`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('{-# LANGUAGE OverloadedStrings #-}');
      expect(result.code).toContain('module Main where');
      expect(result.code).not.toContain('A comment');
    });

    test('preserves OPTIONS pragmas', () => {
      const code = `{-# OPTIONS_GHC -Wall #-}
main = putStrLn "Hello"`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('{-# OPTIONS_GHC -Wall #-}');
    });

    test('preserves INLINE pragmas', () => {
      const code = `{-# INLINE myFunc #-}
myFunc :: Int -> Int
myFunc x = x + 1`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('{-# INLINE myFunc #-}');
    });
  });

  describe('String literals', () => {
    test('preserves -- in string literals', () => {
      const code = `msg = "This has -- dashes"`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('"This has -- dashes"');
    });

    test('preserves comment-like patterns in strings', () => {
      const code = `msg = "This has -- dashes in it"`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('"This has -- dashes in it"');
    });

    test('handles escaped quotes in strings', () => {
      const code = `msg = "She said \\"hello\\"" -- comment`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('msg = "She said \\"hello\\""');
      expect(result.code).not.toContain('-- comment');
    });
  });

  describe('License preservation', () => {
    test('preserves license line comments', () => {
      const code = `-- Copyright (c) 2025
-- Regular comment
main = putStrLn "Hello"`;
      const result = removeComments(code, { language: 'haskell', preserveLicense: true });
      expect(result.code).toContain('Copyright (c) 2025');
      expect(result.code).not.toContain('Regular comment');
    });

    test('preserves license block comments', () => {
      const code = `{- MIT License
   Copyright (c) 2025 -}
-- Regular comment
main = putStrLn "Hello"`;
      const result = removeComments(code, { language: 'haskell', preserveLicense: true });
      expect(result.code).toContain('MIT License');
      expect(result.code).not.toContain('Regular comment');
    });
  });

  describe('keepEmptyLines option', () => {
    test('keeps empty lines where comments were', () => {
      const code = `-- Comment
main = putStrLn "Hello"`;
      const result = removeComments(code, { language: 'haskell', keepEmptyLines: true });
      expect(result.code).toContain('main = putStrLn "Hello"');
      expect(result.code).not.toContain('-- Comment');
    });
  });

  describe('Haskell-specific features', () => {
    test('handles type signatures', () => {
      const code = `-- Type signature for add
add :: Int -> Int -> Int -- takes two ints
add x y = x + y -- returns sum`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('add :: Int -> Int -> Int');
      expect(result.code).toContain('add x y = x + y');
      expect(result.code).not.toContain('Type signature');
      expect(result.code).not.toContain('takes two ints');
      expect(result.code).not.toContain('returns sum');
    });

    test('handles where clauses', () => {
      const code = `f x = a + b
  where
    a = x * 2 -- double
    b = x + 1 -- increment`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('a = x * 2');
      expect(result.code).toContain('b = x + 1');
      expect(result.code).not.toContain('double');
      expect(result.code).not.toContain('increment');
    });

    test('handles do notation', () => {
      const code = `main = do
  -- Get input
  name <- getLine
  -- Print greeting
  putStrLn ("Hello, " ++ name)`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('name <- getLine');
      expect(result.code).toContain('putStrLn');
      expect(result.code).not.toContain('Get input');
      expect(result.code).not.toContain('Print greeting');
    });

    test('handles guards', () => {
      const code = `abs' x
  | x < 0     = -x  -- negate
  | otherwise  = x   -- identity`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('| x < 0     = -x');
      expect(result.code).not.toContain('negate');
      expect(result.code).not.toContain('identity');
    });

    test('handles list comprehensions', () => {
      const code = `evens = [x | x <- [1..100], even x] -- even numbers`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('[x | x <- [1..100], even x]');
      expect(result.code).not.toContain('even numbers');
    });

    test('handles module declarations', () => {
      const code = `{-# LANGUAGE OverloadedStrings #-}
-- | Main module
module Main (main) where

-- | Entry point
main :: IO ()
main = putStrLn "Hello"`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('{-# LANGUAGE OverloadedStrings #-}');
      expect(result.code).toContain('module Main (main) where');
      expect(result.code).toContain('main :: IO ()');
      expect(result.code).not.toContain('Main module');
      expect(result.code).not.toContain('Entry point');
    });

    test('handles data declarations', () => {
      const code = `-- Shape data type
data Shape = Circle Double    -- radius
           | Rectangle Double Double  -- width, height
           deriving (Show)`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('data Shape = Circle Double');
      expect(result.code).not.toContain('Shape data type');
      expect(result.code).not.toContain('-- radius');
    });

    test('handles class and instance declarations', () => {
      const code = `-- Printable class
class Printable a where
  display :: a -> String -- display method

-- Instance for Int
instance Printable Int where
  display = show`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('class Printable a where');
      expect(result.code).toContain('display :: a -> String');
      expect(result.code).not.toContain('Printable class');
      expect(result.code).not.toContain('display method');
    });
  });

  describe('Language detection', () => {
    test('detects Haskell by .hs extension', () => {
      const code = `main = putStrLn "Hello"`;
      const result = removeComments(code, { filename: 'Main.hs' });
      expect(result.detectedLanguage).toBe('haskell');
    });

    test('detects Haskell by .lhs extension', () => {
      const code = `main = putStrLn "Hello"`;
      const result = removeComments(code, { filename: 'Main.lhs' });
      expect(result.detectedLanguage).toBe('haskell');
    });
  });

  describe('Edge cases', () => {
    test('handles empty code', () => {
      const result = removeComments('', { language: 'haskell' });
      expect(result.code).toBe('');
    });

    test('handles code with only comments', () => {
      const code = `-- Only a comment
{- Another comment -}`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code.trim()).toBe('');
    });

    test('handles code with no comments', () => {
      const code = `module Main where
main = putStrLn "Hello, World!"`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain('module Main where');
      expect(result.code).toContain('putStrLn "Hello, World!"');
    });

    test('dry run counts comments without modifying code', () => {
      const code = `-- Comment 1
main = putStrLn "Hello"`;
      const result = removeComments(code, { language: 'haskell', dryRun: true });
      expect(result.code).toBe(code);
      expect(result.removedCount).toBeGreaterThan(0);
    });

    test('handles character literals', () => {
      const code = `dash = '-' -- a dash character
x = 'a' -- a character`;
      const result = removeComments(code, { language: 'haskell' });
      expect(result.code).toContain("dash = '-'");
      expect(result.code).toContain("x = 'a'");
      expect(result.code).not.toContain('a dash character');
    });
  });
});
