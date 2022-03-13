const streets:string[] = [
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

const streetTypes:string[] = [
    "road",
    "street",
    "crescent",
    "boulevard",
]

 function randomStreet() {
    const streetIndex = Math.floor(streets.length * Math.random());
    const typeIndex = Math.floor(streetTypes.length * Math.random());
    return streets[streetIndex] + " " + streetTypes[typeIndex];
}