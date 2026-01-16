import { RuleTester } from "eslint"
import tsParser from "@typescript-eslint/parser"
import rule from "../../eslint/rules/prefer-to-sorted.js"

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser
  }
})

ruleTester.run("prefer-to-sorted", rule, {
  valid: [
    {
      code: "const sorted = users.toSorted((a, b) => a.name.localeCompare(b.name))"
    }
  ],
  invalid: [
    {
      code: "const sorted = users.sort((a, b) => a.name.localeCompare(b.name))",
      output: "const sorted = users.toSorted((a, b) => a.name.localeCompare(b.name))",
      errors: [{ messageId: "useToSorted" }]
    },
    {
      code: "users['sort']((a, b) => a.name.localeCompare(b.name))",
      errors: [{ messageId: "useToSorted" }]
    }
  ]
})

