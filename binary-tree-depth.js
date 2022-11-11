const tree = {
  value: "a",
  left: {
    value: "b",
    left: {
      value: "c",
    }
  },
  right: {
    value: "d",
    left: {
      value: "e",
    },
    right: {
      value: "f",
    }
  }
}

const findLevel = (tree, value, level = 0) => {
  if (!tree) return -1
  if (tree.value === value) return level
  return Math.max(findLevel(tree.left, value, level + 1), findLevel(tree.right, value, level + 1))
}

console.log(findLevel(tree, "a")) // 0
console.log(findLevel(tree, "b")) // 1
console.log(findLevel(tree, "c")) // 2
console.log(findLevel(tree, "d")) // 1
console.log(findLevel(tree, "e")) // 2
console.log(findLevel(tree, "f")) // 2
