const fs = require("fs");
const os = require("os");
const overlay_png = require("./overlay_png_to_video.js");


let cube_list = fs.readFileSync("./from_txt/cubes_list.txt", "utf8").split(os.EOL);
const input = {
	"metadata":{"bitrate_type":"vbr", "key_every":25, "low_br":1, "high_br":30, "output_mp4":"out/ass.mp4"},
	"ffmpeg":[
		cube_list,
		["png/teapot0000.png","png/teapot0001.png","png/teapot0002.png","png/teapot0003.png","png/teapot0004.png","png/teapot0005.png","png/teapot0006.png","png/teapot0007.png","png/teapot0008.png","png/teapot0009.png","png/teapot0010.png","png/teapot0011.png","png/teapot0012.png","png/teapot0013.png","png/teapot0014.png","png/teapot0015.png","png/teapot0016.png","png/teapot0017.png","png/teapot0018.png","png/teapot0019.png","png/teapot0020.png","png/teapot0021.png","png/teapot0022.png","png/teapot0023.png","png/teapot0024.png","png/teapot0025.png","png/teapot0026.png","png/teapot0027.png","png/teapot0028.png","png/teapot0029.png","png/teapot0030.png","png/teapot0031.png","png/teapot0032.png","png/teapot0033.png","png/teapot0034.png","png/teapot0035.png","png/teapot0036.png","png/teapot0037.png","png/teapot0038.png","png/teapot0039.png","png/teapot0040.png"],
		["png/tap0000.png"]
	],
	passthrough_data:{}
}

overlay_png(input);
