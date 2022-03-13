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

exports.getRandomName = function getRandomName() {
    const prefixIndex = Math.floor(prefix.length * Math.random());
    const suffixIndex = Math.floor(suffix.length * Math.random());
    return prefix[prefixIndex] + " " + suffix[suffixIndex];
}

const streets = [
    "Fake",
    "Cool",
    "Gamer",
    "Spiffy",
    "Long",
    "Short",
    "King",
    "Queen",
    "Fuzzy",
    "Damp",
];

const streetTypes = [
    "road",
    "street",
    "crescent",
    "boulevard",
]

exports.randomStreet = function randomStreet() {
    const streetIndex = Math.floor(streets.length * Math.random());
    const typeIndex = Math.floor(streetTypes.length * Math.random());
    return streets[streetIndex] + " " + streetTypes[typeIndex];
}