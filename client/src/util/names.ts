const prefix = [
    "Orange",
    "Yellow",
    "Blue",
    "Green",
    "Purple",
    "Violet",
    "Red",
    "Indigo",
    "Wooden",
    "Grassy"
]

const suffix = [
    "Cat",
    "Dog",
    "Mouse",
    "Pie",
    "Cereal",
    "Squash",
    "Pigeon",
    "Dove",
    "Phone",
    "Sock",
    "Couch"
]

 function getRandomName() {
    const prefixIndex = Math.floor(prefix.length * Math.random());
    const suffixIndex = Math.floor(suffix.length * Math.random());
    return prefix[prefixIndex] + " " + suffix[suffixIndex];
}