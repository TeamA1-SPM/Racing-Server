module.exports = {
    createRoad: function () {
        return createSegments();
    }



}

var segments;
var segmentLength = 200;
var rumbleLength = 3;
var totalCars = 200;
var playerZ = null;

var fps = 60;
var step = 1 / fps;
var maxSpeed = segmentLength / step;

const fs = require('fs');
const path = require('path');
const road_file_path = path.join(__dirname, 'data', 'road.json');

let roadData;
let newRoad;
let tempSeg;


var ROAD = {
    LENGTH: { NONE: 0, SHORT: 25, MEDIUM: 50, LONG: 100 },
    HILL: { NONE: 0, LOW: 20, MEDIUM: 40, HIGH: 60 },
    CURVE: { NONE: 0, EASY: 2, MEDIUM: 4, HARD: 6 }
};

function findSegment(z) { return segments[Math.floor(z / segmentLength) % segments.length]; }
function lastY() { return (segments.length == 0) ? 0 : segments[segments.length - 1].p2.world.y; }

// Utility functions
function toInt(obj, def) { if (obj !== null) { var x = parseInt(obj, 10); if (!isNaN(x)) return x; } return toInt(def, 0); }
function easeIn(a, b, percent) { return a + (b - a) * Math.pow(percent, 2); }
function easeInOut(a, b, percent) { return a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5); }
function randomChoice(options) { return options[randomInt(0, options.length - 1)]; }
function randomInt(min, max) { return Math.round(interpolate(min, max, Math.random())); }
function interpolate(a, b, percent) { return a + (b - a) * percent; }

function createSegments() {
    segments = [];

    addStraight(ROAD.LENGTH.SHORT);
    addLowRollingHills();
    addSCurves();
    addCurve(ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.LOW);
    addBumps();
    addLowRollingHills();
    addCurve(ROAD.LENGTH.LONG * 2, ROAD.CURVE.MEDIUM, ROAD.HILL.MEDIUM);
    addStraight();
    addHill(ROAD.LENGTH.MEDIUM, ROAD.HILL.HIGH);
    addSCurves();
    addCurve(ROAD.LENGTH.LONG, -ROAD.CURVE.MEDIUM, ROAD.HILL.NONE);
    addHill(ROAD.LENGTH.LONG, ROAD.HILL.HIGH);
    addCurve(ROAD.LENGTH.LONG, ROAD.CURVE.MEDIUM, -ROAD.HILL.LOW);
    addBumps();
    addHill(ROAD.LENGTH.LONG, -ROAD.HILL.MEDIUM);
    addStraight();
    addSCurves();
    addDownhillToEnd();

    resetSprites();
    resetCars();

    //newRoad = readRoad();

    for (let index = 0; index < segments.length; index++) {
        let seg = segments[index];
        roadData = {
            "index": seg.index,
            "p1": [
                seg.p1.world.y, seg.p1.world.z
            ],
            "p2": [
                seg.p2.world.y, seg.p2.world.z
            ],
            "curve": seg.curve,
            "sprite": seg.sprites,
            "cars": seg.cars
        };

        writeRoad(roadData);
    }

    //writeNewRoad();

    segments[findSegment(playerZ).index + 2].color = COLORS.START;
    segments[findSegment(playerZ).index + 3].color = COLORS.START;
    for (var n = 0; n < rumbleLength; n++)
        segments[segments.length - 1 - n].color = COLORS.FINISH;

    trackLength = segments.length * segmentLength;

    //console.log(newRoad);

    return segments;
}

function addSegment(curve, y) {
    var n = segments.length;

    let tempY = lastY();
    //console.log(tempY);

    segments.push({
        index: n,
        p1: { world: { y: tempY, z: n * segmentLength }, camera: {}, screen: {} },
        p2: { world: { y: y, z: (n + 1) * segmentLength }, camera: {}, screen: {} },
        curve: curve,
        sprites: [],
        cars: [],
        color: Math.floor(n / rumbleLength) % 2 ? COLORS.DARK : COLORS.LIGHT
    });
    /*
        roadData = {
            "index": n,
            "p1": [
                tempY, n * segmentLength
            ],
            "p2": [
                y, (n + 1) * segmentLength
            ],
            "curve": curve,
            "sprite": [],
            "cars": []
        }*/

    // writeRoad(roadData);
}

function addRoad(enter, hold, leave, curve, y) {
    var startY = lastY();
    var endY = startY + (toInt(y, 0) * segmentLength);
    var n, total = enter + hold + leave;
    for (n = 0; n < enter; n++)
        addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
    for (n = 0; n < hold; n++)
        addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
    for (n = 0; n < leave; n++)
        addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
}

function addStraight(num) {
    num = num || ROAD.LENGTH.MEDIUM;
    addRoad(num, num, num, 0, 0);
}

function addHill(num, height) {
    num = num || ROAD.LENGTH.MEDIUM;
    height = height || ROAD.HILL.MEDIUM;
    addRoad(num, num, num, 0, height);
}

function addCurve(num, curve, height) {
    num = num || ROAD.LENGTH.MEDIUM;
    curve = curve || ROAD.CURVE.MEDIUM;
    height = height || ROAD.HILL.NONE;
    addRoad(num, num, num, curve, height);
}

function addLowRollingHills(num, height) {
    num = num || ROAD.LENGTH.SHORT;
    height = height || ROAD.HILL.LOW;
    addRoad(num, num, num, 0, height / 2);
    addRoad(num, num, num, 0, -height);
    addRoad(num, num, num, ROAD.CURVE.EASY, height);
    addRoad(num, num, num, 0, 0);
    addRoad(num, num, num, -ROAD.CURVE.EASY, height / 2);
    addRoad(num, num, num, 0, 0);
}

function addSCurves() {
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, ROAD.HILL.NONE);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.MEDIUM);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.EASY, -ROAD.HILL.LOW);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, ROAD.HILL.MEDIUM);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.MEDIUM, -ROAD.HILL.MEDIUM);
}

function addBumps() {
    addRoad(10, 10, 10, 0, 5);
    addRoad(10, 10, 10, 0, -2);
    addRoad(10, 10, 10, 0, -5);
    addRoad(10, 10, 10, 0, 8);
    addRoad(10, 10, 10, 0, 5);
    addRoad(10, 10, 10, 0, -7);
    addRoad(10, 10, 10, 0, 5);
    addRoad(10, 10, 10, 0, -2);
}

function addDownhillToEnd(num) {
    num = num || 200;
    addRoad(num, num, num, -ROAD.CURVE.EASY, -lastY() / segmentLength);
}

function addSprite(n, sprite, offset) {
    segments[n].sprites.push({ source: sprite, offset: offset });

    // newRoad = readRoad();

    /*
        newRoad.forEach((element) => {
            if (element.index === n) {
                console.log("I am here");
                newRoad.sprite = "test";
            }
        });*/

    /*
    newRoad.map(i => {
        i.sprite = [sprite, offset];
    });
    */

    // console.log(newRoad);

}

function resetSprites() {
    var n, i;

    addSprite(20, SPRITES.BILLBOARD07, -1);
    addSprite(40, SPRITES.BILLBOARD06, -1);
    addSprite(60, SPRITES.BILLBOARD08, -1);
    addSprite(80, SPRITES.BILLBOARD09, -1);
    addSprite(100, SPRITES.BILLBOARD01, -1);
    addSprite(120, SPRITES.BILLBOARD02, -1);
    addSprite(140, SPRITES.BILLBOARD03, -1);
    addSprite(160, SPRITES.BILLBOARD04, -1);
    addSprite(180, SPRITES.BILLBOARD05, -1);

    addSprite(240, SPRITES.BILLBOARD07, -1.2);
    addSprite(240, SPRITES.BILLBOARD06, 1.2);
    addSprite(segments.length - 25, SPRITES.BILLBOARD07, -1.2);
    addSprite(segments.length - 25, SPRITES.BILLBOARD06, 1.2);

    for (n = 10; n < 200; n += 4 + Math.floor(n / 100)) {
        addSprite(n, SPRITES.PALM_TREE, 0.5 + Math.random() * 0.5);
        addSprite(n, SPRITES.PALM_TREE, 1 + Math.random() * 2);
    }

    for (n = 250; n < 1000; n += 5) {
        addSprite(n, SPRITES.COLUMN, 1.1);
        addSprite(n + randomInt(0, 5), SPRITES.TREE1, -1 - (Math.random() * 2));
        addSprite(n + randomInt(0, 5), SPRITES.TREE2, -1 - (Math.random() * 2));
    }

    for (n = 200; n < segments.length; n += 3) {
        addSprite(n, randomChoice(SPRITES.PLANTS), randomChoice([1, -1]) * (2 + Math.random() * 5));
    }

    var side, sprite, offset;
    for (n = 1000; n < (segments.length - 50); n += 100) {
        side = randomChoice([1, -1]);
        addSprite(n + randomInt(0, 50), randomChoice(SPRITES.BILLBOARDS), -side);
        for (i = 0; i < 20; i++) {
            sprite = randomChoice(SPRITES.PLANTS);
            offset = side * (1.5 + Math.random());
            addSprite(n + randomInt(0, 50), sprite, offset);
        }

    }
}

function resetCars() {
    cars = [];
    var n, car, segment, offset, z, sprite, speed;
    for (var n = 0; n < totalCars; n++) {
        offset = Math.random() * randomChoice([-0.8, 0.8]);
        z = Math.floor(Math.random() * segments.length) * segmentLength;
        sprite = randomChoice(SPRITES.CARS);
        speed = maxSpeed / 4 + Math.random() * maxSpeed / (sprite == SPRITES.SEMI ? 4 : 2);
        car = { offset: offset, z: z, sprite: sprite, speed: speed };
        segment = findSegment(car.z);
        segment.cars.push(car);
        cars.push(car);
        /*
                let allCarsInSegment = segment.cars;
        
                console.log(segment);
                console.log(segment.cars);
        
                newRoad.map(i => {
                    if (i.index == segment.index) {
                        i.cars = allCarsInSegment;
                    }
                });*/

    };


}


var COLORS = {
    SKY: '#72D7EE',
    TREE: '#005108',
    FOG: '#005108',
    LIGHT: { road: '#6B6B6B', grass: '#10AA10', rumble: '#555555', lane: '#CCCCCC' },
    DARK: { road: '#696969', grass: '#009A00', rumble: '#BBBBBB' },
    START: { road: 'white', grass: 'white', rumble: 'white' },
    FINISH: { road: 'black', grass: 'black', rumble: 'black' }
};

/*
var SPRITES = {
    PALM_TREE: { x: 5, y: 5, w: 215, h: 540 },
    BILLBOARD08: { x: 230, y: 5, w: 385, h: 265 },
    TREE1: { x: 625, y: 5, w: 360, h: 360 },
    DEAD_TREE1: { x: 5, y: 555, w: 135, h: 332 },
    BILLBOARD09: { x: 150, y: 555, w: 328, h: 282 },
    BOULDER3: { x: 230, y: 280, w: 320, h: 220 },
    COLUMN: { x: 995, y: 5, w: 200, h: 315 },
    BILLBOARD01: { x: 625, y: 375, w: 300, h: 170 },
    BILLBOARD06: { x: 488, y: 555, w: 298, h: 190 },
    BILLBOARD05: { x: 5, y: 897, w: 298, h: 190 },
    BILLBOARD07: { x: 313, y: 897, w: 298, h: 190 },
    BOULDER2: { x: 621, y: 897, w: 298, h: 140 },
    TREE2: { x: 1205, y: 5, w: 282, h: 295 },
    BILLBOARD04: { x: 1205, y: 310, w: 268, h: 170 },
    DEAD_TREE2: { x: 1205, y: 490, w: 150, h: 260 },
    BOULDER1: { x: 1205, y: 760, w: 168, h: 248 },
    BUSH1: { x: 5, y: 1097, w: 240, h: 155 },
    CACTUS: { x: 929, y: 897, w: 235, h: 118 },
    BUSH2: { x: 255, y: 1097, w: 232, h: 152 },
    BILLBOARD03: { x: 5, y: 1262, w: 230, h: 220 },
    BILLBOARD02: { x: 245, y: 1262, w: 215, h: 220 },
    STUMP: { x: 995, y: 330, w: 195, h: 140 },
    SEMI: { x: 1365, y: 490, w: 122, h: 144 },
    TRUCK: { x: 1365, y: 644, w: 100, h: 78 },
    CAR03: { x: 1383, y: 760, w: 88, h: 55 },
    CAR02: { x: 1383, y: 825, w: 80, h: 59 },
    CAR04: { x: 1383, y: 894, w: 80, h: 57 },
    CAR01: { x: 1205, y: 1018, w: 80, h: 56 },
    PLAYER_UPHILL_LEFT: { x: 1383, y: 961, w: 80, h: 45 },
    PLAYER_UPHILL_STRAIGHT: { x: 1295, y: 1018, w: 80, h: 45 },
    PLAYER_UPHILL_RIGHT: { x: 1385, y: 1018, w: 80, h: 45 },
    PLAYER_LEFT: { x: 995, y: 480, w: 80, h: 41 },
    PLAYER_STRAIGHT: { x: 1085, y: 480, w: 80, h: 41 },
    PLAYER_RIGHT: { x: 995, y: 531, w: 80, h: 41 }
};*/

var SPRITES = {
    PALM_TREE: "PALM_TREE",
    BILLBOARD08: "BILLBOARD08",
    TREE1: "TREE1",
    DEAD_TREE1: "DEAD_TREE1",
    BILLBOARD09: "BILLBOARD09",
    BOULDER3: "BOULDER3",
    COLUMN: "COLUMN",
    BILLBOARD01: "BILLBOARD01",
    BILLBOARD06: "BILLBOARD06",
    BILLBOARD05: "BILLBOARD05",
    BILLBOARD07: "BILLBOARD07",
    BOULDER2: "BOULDER2",
    TREE2: "TREE2",
    BILLBOARD04: "BILLBOARD04",
    DEAD_TREE2: "DEAD_TREE2",
    BOULDER1: "BOULDER1",
    BUSH1: "BUSH1",
    CACTUS: "CACTUS",
    BUSH2: "BUSH2",
    BILLBOARD03: "BILLBOARD03",
    BILLBOARD02: "BILLBOARD02",
    STUMP: "STUMP",
    SEMI: "SEMI",
    TRUCK: "TRUCK",
    CAR03: "CAR03",
    CAR02: "CAR02",
    CAR04: "CAR04",
    CAR01: "CAR01",
    PLAYER_UPHILL_LEFT: "PLAYER_UPHILL_LEFT",
    PLAYER_UPHILL_STRAIGHT: "PLAYER_UPHILL_STRAIGHT",
    PLAYER_UPHILL_RIGHT: "PLAYER_UPHILL_RIGHT",
    PLAYER_LEFT: "PLAYER_LEFT",
    PLAYER_STRAIGHT: "PLAYER_STRAIGHT",
    PLAYER_RIGHT: "PLAYER_RIGHT",
};

SPRITES.BILLBOARDS = [SPRITES.BILLBOARD01, SPRITES.BILLBOARD02, SPRITES.BILLBOARD03, SPRITES.BILLBOARD04, SPRITES.BILLBOARD05, SPRITES.BILLBOARD06, SPRITES.BILLBOARD07, SPRITES.BILLBOARD08, SPRITES.BILLBOARD09];
SPRITES.PLANTS = [SPRITES.TREE1, SPRITES.TREE2, SPRITES.DEAD_TREE1, SPRITES.DEAD_TREE2, SPRITES.PALM_TREE, SPRITES.BUSH1, SPRITES.BUSH2, SPRITES.CACTUS, SPRITES.STUMP, SPRITES.BOULDER1, SPRITES.BOULDER2, SPRITES.BOULDER3];
SPRITES.CARS = [SPRITES.CAR01, SPRITES.CAR02, SPRITES.CAR03, SPRITES.CAR04, SPRITES.SEMI, SPRITES.TRUCK];

function readRoad() {
    try {
        const data = fs.readFileSync(road_file_path, 'utf-8');
        const abschnitt = JSON.parse(data).abschnitt;
        return abschnitt;
    } catch (error) {
        console.log(error);
        return false;
    }
};


function writeRoad(roadData) {
    try {
        // Array wird um die neuen Daten erweitert
        let abschnitt = readRoad();
        abschnitt.push(roadData);
        // Erweitertes Array wird in JSON-Format in die Datei geschrieben
        fs.writeFileSync(road_file_path, JSON.stringify({ abschnitt }, null, 2), 'utf-8');
    } catch (error) {
        console.log(error);
        return false;
    }
};

function writeNewRoad() {
    try {
        // Array wird um die neuen Daten erweitert
        let abschnitt = newRoad;
        fs.writeFileSync(road_file_path, JSON.stringify({ abschnitt }, null, 2), 'utf-8');
    } catch (error) {
        console.log(error);
        return false;
    }
};