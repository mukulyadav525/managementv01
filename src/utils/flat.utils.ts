/**
 * Predicts the floor number based on a flat number string.
 * Logic:
 * - 1-99: Floor 0 (Ground)
 * - 100-199: Floor 1
 * - 200-299: Floor 2
 * - 1000-1099: Floor 10
 * - 1100-1199: Floor 11
 * 
 * It extracts the numeric part and takes everything except the last two digits as the floor.
 */
export const predictFloor = (flatNumber: string): number => {
    // Extract numeric part (e.g., "A-502" -> "502", "104" -> "104")
    const numericMatch = flatNumber.match(/\d+/);
    if (!numericMatch) return 0;

    const num = parseInt(numericMatch[0]);
    if (num < 100) return 0;

    // Take everything but the last 2 digits
    return Math.floor(num / 100);
};

/**
 * Formats a display string combining flat and floor.
 */
export const formatFlatDisplay = (flatNumber: string | number, floor: string | number): string => {
    return `Flat ${flatNumber} (Floor ${floor})`;
};

/**
 * Standardizes flat naming to "<tower name> - <flat no>"
 */
export const formatFlatName = (flatNumber: string | number, buildingName?: string): string => {
    if (!buildingName) return `${flatNumber}`;
    // If building name is already in the flat number, don't duplicate (unlikely with current schema but safe)
    if (typeof flatNumber === 'string' && flatNumber.startsWith(buildingName)) return flatNumber;
    return `${buildingName} - ${flatNumber}`;
};
