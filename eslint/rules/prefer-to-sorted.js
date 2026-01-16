const rule = {
  meta: {
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: {
      useToSorted: "Use toSorted() instead of sort() to avoid mutating arrays."
    }
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        if (!callee || callee.type !== "MemberExpression" || callee.optional) {
          return
        }
        if (
          !callee.computed &&
          callee.property.type === "Identifier" &&
          callee.property.name === "sort"
        ) {
          context.report({
            node: callee.property,
            messageId: "useToSorted",
            fix(fixer) {
              return fixer.replaceText(callee.property, "toSorted")
            }
          })
          return
        }
        if (
          callee.computed &&
          callee.property.type === "Literal" &&
          callee.property.value === "sort"
        ) {
          context.report({
            node: callee.property,
            messageId: "useToSorted"
          })
        }
      }
    }
  }
}

export default rule

