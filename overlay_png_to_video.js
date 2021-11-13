//@ test to overlay several png images
const spawn = require('child_process').spawn;
const FFMPEG_PATH = __dirname+'\\ffmpeg.exe';
//@ ffmpeg -f image2 -i image%d.jpg video.mpg
//@ ffmpeg -r 12 -y -i "image_%010d.png" output.mpg
//@ ffmpeg -i im_%d.png -i im2_%d.png -filter_complex "[0][1]overlay" -y out.mp4
//const params = ["-i", "im_%d.png", "-y", "out.mp4"]
const params = [
	"-i", "png/teapot%04d.png", 
	"-i", "png/tap%04d.png", 
	"-i", "png/cube%04d.png", 
	"-filter_complex","[0][1]overlay[v1];[v1][2]overlay[v2]", 
	//"-filter_complex","[0][1]overlay",
	"-map", "[v2]",
	"-y", "out1234.mp4"]
launch_ffmpeg(FFMPEG_PATH, params);

function main(){
	const app = new App(
		new LimitedVideoCreating(
			new CreatedVideo(
				new Params(
					new ConfirmedPngSequences(
						new PngSequences()
					)
				)
				new SpawnedFfmpeg(FFMPEG_PATH, spawn)
			),
			new InstancesLimiter(2)
		)
	).run();
	test_external_request(app);
}

function test_external_request(app){
	app.go(
		{
			id:1, 
			files_mask:[
				"png/teapot%04d.png", 
				"png/cube%04d.png",
				"png/sphere%04d.png"
			]
		},
		res=>{
			if(res){
				console.log(res.id,"ready, out video path=", res.out);
			}else{
				console.error("test_external_request: res=", res)
			}
		}
	)
}

function App(limitedVideoCreating){
	this.reqs = {};
	this.go=(req_pars, cb)=>{
		if(req_pars.id){
			limitedVideoCreating.add(req_pars)
			.on("video_ready",(id_and_out_video_path)=>{
				cb(id_and_out_video_path)
			})
		}else{
			cb("no id!")
		}
	}
	this.run=()=>{
		limitedVideoCreating.run();
		return this;
	}
}

function LimitedVideoCreating(createdVideo, instancesLimiter){
	this.run=()=>{
		instancesLimiter.run()
		return this
	}
	this.add=(req_pars)=>{
		if(instancesLimiter.ask("is_allow")){
			instancesLimiter.add(createdVideo.instance(req_pars).run())
		}
	}
}

function CreatedVideo(params, spawnedFfmpeg, req_pars){
	this.req_pars = req_pars;
	this.instance=(req_pars)=>{return new CreatedVideo(params, spawnedFfmpeg, req_pars)}
	this.run=()=>{
		spawnedFfmpeg.instance().run(params.instance(req_pars))
	}
}

function Params(confirmedPngSequences, req_pars){
	this.instance=(req_pars)=>{return new Params(confirmedPngSequences, req_pars)}
}

function ConfirmedPngSequences(){}

function PngSequences(){}

function SpawnedFfmpeg(){}

function InstancesLimiter(instances_limit){
	const instances_limit = instances_limit || 3;
	this.instances_count = 0
	this.exemplars = {};
	this.run=()=>{
		return this;
	}
	this.add=(createdVideo)=>{
		this.exemplars[this.instances_count++] = createdVideo;
		createdVideo.on("ready", ()=>{
			this.instances_count--;
		})
	}
}

function ExternalListener(){}

function launch_ffmpeg(FFMPEG_PATH, params){
	try{ ffmpeg_exe = spawn(FFMPEG_PATH, params); } 
	catch(err){ console.error("ffmpeg_file_info(): spawn Error: "+err) }
	ffmpeg_exe.stdout.on('data', (chunk)=>{
		//@ если не было запроса на перезапись файла, то скорее всего поток будет литься сюда в stdout
		console.log("-----STDOUT:"+chunk.toString());
	})
	ffmpeg_exe.stderr.on('data', (chunk)=>{
		//@ если уже был запрос на перезапись файла и мы ответили 'y', то сокрее всего остаток информации будет лить сюда в stderr
		console.error("-----STDeRROR:"+chunk.toString());
	});
	ffmpeg_exe.stdout.on('close', (code)=> {
		console.log('---stdout close event');
		//this.ffmpeg_exe.stdout.removeAllListeners();
		//setTimeout(()=>{ this.cbEnd('stdout') }, 0)
		//process.nextTick(()=>{this.cbEnd('stdout')});
	});
	ffmpeg_exe.stderr.on('close', (code)=> {
		console.log('---stderr close event');
		//this.ffmpeg_exe.stderr.removeAllListeners();
		//setTimeout(()=>{ this.cbEnd('stderr') }, 0)
		//process.nextTick(()=>{this.cbEnd('stderr')});
	});
}