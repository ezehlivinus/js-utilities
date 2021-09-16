function CamelCase(str) { 

  // code goes here  
  const kebabCase = () => {
    return  (" " + str)
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, function(match, chr) {
        return chr.toUpperCase();
    });
  }
  const _kebabCase = kebabCase()
  const lowerKebabFirstChar = _kebabCase.charAt(0).toLowerCase()
  return lowerKebabFirstChar.concat(_kebabCase.substring(1))

}
