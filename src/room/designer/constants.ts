export const structureMapping: { [s: string]: BuildableStructureConstant } = {
    'e': STRUCTURE_EXTENSION,
    'r': STRUCTURE_ROAD,
    's': STRUCTURE_SPAWN,
    'S': STRUCTURE_STORAGE,
    't': STRUCTURE_TOWER,
    'T': STRUCTURE_TERMINAL,
    'R': STRUCTURE_RAMPART,
    'l': STRUCTURE_LAB,
    'L': STRUCTURE_LINK,
    'p': STRUCTURE_POWER_SPAWN,
    'w': STRUCTURE_WALL,
    'n': STRUCTURE_NUKER,
    'o': STRUCTURE_OBSERVER,
    'f': STRUCTURE_FACTORY
}

export const INF = 0x3f3f3f3f;
export const dx = [0, 1, 0, -1, 1, 1, -1, -1];
export const dy = [1, 0, -1, 0, 1, -1, -1, 1];
