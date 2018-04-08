/**
* Extract the color and opacity form a rgba color
*/
export function rgba2hex(rgb): { color: string, opacity: number } {
    rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)(\s|,)*(([0-9]*[.])?[0-9]+)?/i);
    if (rgb) {
        return {
            color: "#" +
                ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
                ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
                ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2),
            opacity: parseFloat(rgb[5])
        };
    } else {
        throw 'Color ' + rgb + ' is not in rgba format';
    }
}