//@ PLEASE USE THIS FILE FROM ANOTHER FILE THROUGH "REQUIRE" METHOD
const spawn = require('child_process').spawn;
const FFMPEG_PATH = __dirname+'\\ffmpeg.exe';
const os = require('os');
const fs = require('fs');
//@ ffmpeg -f image2 -i image%d.jpg video.mpg
//@ ffmpeg -r 12 -y -i "image_%010d.png" output.mpg
//@ ffmpeg -i im_%d.png -i im2_%d.png -filter_complex "[0][1]overlay" -y out.mp4
//const params = ["-i", "im_%d.png", "-y", "out.mp4"]
//launch_ffmpeg(FFMPEG_PATH, params, spawn);
module.exports = function main(input_settings){
	const app = new App(
		new LimitedVideoCreating(
			new CreatedVideo(
				new PreparedParams(),
				new SpawnedFfmpeg(FFMPEG_PATH, spawn)
			),
			input_settings
		)
	).run().add(input_settings, res=>{
		if(res && !res.err){
			console.log("png_to_video:",res.metadata.output_mp4,"ready!");
		}else{
			console.error("png_to_video failed", res)
		}
	})
	//test_external_request(app);
}

function App(limitedVideoCreating){
	this.add=(req_pars, cb)=>{
		const checked = check_input(req_pars.ffmpeg);
		if(checked.err){
			//@
			console.error("png_to_video: Wrong input:", checked.err)
			cb(checked)
		}else{
			if(typeof req_pars.id == "undefined"){req_pars.id = 1}
			limitedVideoCreating.add(req_pars,(id_and_out_video_path)=>{
				cb(id_and_out_video_path)
			})
		}
	}
	this.run=()=>{
		limitedVideoCreating.run();
		return this;
	}
	function check_input(pars){
		const res = {};
		if(typeof pars == "undefined") res.err = "ffmpeg cannot be undefined";
		else if(!Array.isArray(pars)) res.err = "ffmpeg must be typeof array";
		else if(pars.length < 1) res.err = "ffmpeg must contain 1 or more members";
		else{
			pars.forEach(elem=>{
				if(!Array.isArray(elem)) res.err = "each memeber must be typoef array";
				else{
					if(elem.length < 1) res.err = "each member must be length 1 or greater";
					elem.forEach(str=>{
						if(typeof str != "string") res.err = "each member must be comprised of strings only";
					});
				}
			})
		}
		return res;
	}
}

function LimitedVideoCreating(createdVideo, input_settings){
	this.ffmpeg_instances_limit;//run
	this.ffmpeg_instances_count = 0
	this.ffmpeg_exemplars = {};
	this.requests = {};
	this.run=()=>{
		this.ffmpeg_instances_limit =  2
		//console.log("LimitedVideoCreating.run: ffmpeg_instances_limit=", this.ffmpeg_instances_limit)
		return this;
	}
	this.add=(req_pars, cb)=>{
		//console.log("LimitedVideoCreating.add: id=", req_pars.id)
		this.requests[req_pars.id] = cb;
		if(this.ffmpeg_instances_count++ < this.ffmpeg_instances_limit){
			const currentCreatedVideo = createdVideo.instance(req_pars);
			currentCreatedVideo.run().on("video_ready", (res)=>{
				this.ffmpeg_instances_count--;
				this.requests[res.id](res);
			})
			//instancesLimiter.add(createdVideo.instance(req_pars).run())
		}else{console.error("!!")}
	}
	this.on=(evt, cb)=>{
		if(evt == "video_ready"){
			
		}
	}
}

function CreatedVideo(preparedParams, spawnedFfmpeg, req_pars){
	this.req_pars = req_pars;
	this.instance=(req_pars)=>{return new CreatedVideo(preparedParams, spawnedFfmpeg, req_pars)}
	this.cb=()=>{console.log("CreatedVideo: callback is not overrided in:", req_pars.id)};//on
	this.run=(input_settings)=>{
		//console.log("CreatedVideo.run: id=", req_pars.id)
		spawnedFfmpeg.instance()
		.run(preparedParams.instance(req_pars).run().res())
		.onRes(is_ok=>{
			this.cb(req_pars);
		});
		return this;
	}
	this.on=(evt, cb)=>{
		if(evt=="video_ready"){
			if(typeof cb == "function"){
				this.cb = cb;
			}else{console.error("CreatedVideo.on: callback is not a function at:", req_pars.id)}
		}else{console.error("CreatedVideo.on: unknown event:", req_pars.id)}
	}
}

function SpawnedFfmpeg(FFMPEG_PATH, spawn){
	this.instance=()=>{return new SpawnedFfmpeg(FFMPEG_PATH, spawn)}
	this.cb=()=>{console.log("SpawnedFfmpeg: callback is not overrided")};//onRes
	this.onRes=(cb)=>{
		if(typeof cb == "function"){this.cb = cb;}
	}
	this.run=(prepared_params)=>{
		var ffmpeg_exe;
		try{
			console.log("png_to_video try to launch ffmpeg.exe...")
			ffmpeg_exe = spawn(FFMPEG_PATH, prepared_params);
		} 
		catch(err){ console.error("SpawnedFfmpeg: spawn Error: "+err) }
		//@ если не было запроса на перезапись файла, то скорее всего поток будет литься сюда в stdout
		ffmpeg_exe.stdout.on('data', (chunk)=>{
			//console.log("-----STDOUT:"+chunk.toString());
		});
		//@ если уже был запрос на перезапись файла и мы ответили 'y', то сокрее всего остаток информации будет лить сюда в stderr
		ffmpeg_exe.stderr.on('data', (chunk)=>{
			//console.error("-----STDeRROR:"+chunk.toString());
		});
		//@ Следующие 2 события говорят об окончании работы
		ffmpeg_exe.stdout.on('close', (code)=> {
			//console.log('>>>stdout close event');
			this.cb(true);
		});
		ffmpeg_exe.stderr.on('close', (code)=> {
			//console.log('>>>stderr close event');
		});
		return this;
	}
}

function PreparedParams(confirmedPngSequences, req_pars){
	this.params = [];
	this.unknown_id_counter = 0;
	this.instance=(req_pars)=>{return new PreparedParams(confirmedPngSequences, req_pars)}
	this.res=()=>{return this.params}
	this.run=()=>{
		if(req_pars){
			if(Array.isArray(req_pars.ffmpeg)){
				//@ fit members to one length
				const check1 = check_members_of_one_length(req_pars.ffmpeg);
				if(check1.err){
					throw new Error(check1.err)
				}
				//@ construct params line
				req_pars.ffmpeg.forEach((arr, index)=>{
					this.params.push("-f", "concat");
					this.params.push("-r", "24");
					const listname = prepare_txt_list(arr, index);
					this.params.push("-i", listname);
				})
				const filter_params = add_filter_complex(req_pars.ffmpeg, this.unknown_id_counter++);
				//console.log("filter_params=", filter_params)
				this.params = this.params.concat(filter_params);
				//@bitrate and keyframe
				if(req_pars.metadata){
					let br_type = "cbr";
					//console.log(">>>>>>>>>>>>> br_type=", br_type)
					let low_br = 1;
					let high_br = 10;
					//@ "vbr" or "cbr"
					if(req_pars.metadata.bitrate_type){br_type = req_pars.metadata.bitrate_type;}
					if(req_pars.metadata.low_br){low_br = req_pars.metadata.low_br;}
					if(req_pars.metadata.high_br){high_br = req_pars.metadata.high_br;}
					//@ -b 4000k -minrate 4000k -maxrate 4000k
					let low_br_par, high_br_par;
					if(br_type == "cbr"){
						low_br_par = (low_br*1000)+"k"
						high_br_par = low_br_par;
					}else{
						//@ variable bitrate
						low_br_par = (low_br*1000)+"k"
						high_br_par = (high_br*1000)+"k"
					}
					this.params.push("-b:v", low_br_par, "-minrate:v", low_br_par, "-maxrate:v", high_br_par)
					if(req_pars.metadata.key_every){
						const key = req_pars.metadata.key_every;
						//this.params.push("-c:v h264");
						this.params.push("-g", key);
						//const expr_par = "expr:gte(t,n_forced*"+key+")"
						//console.log("expr_par=",expr_par)
						//this.params.push("-force_key_frames", expr_par);
					}
				}
				//@finally output name and rewrite old
				const id = req_pars.id||("unknown_id"+this.unknown_id_counter++)
				let out_vfile_name = "";
				if(req_pars.metadata && req_pars.metadata.output_mp4){
					out_vfile_name = req_pars.metadata.output_mp4;
				}else{out_vfile_name = "out_unknown_name.mp4"}
				this.params.push("-y", out_vfile_name);
				console.log("png_to_video params:", JSON.stringify(this.params))
			}
			else if(req_pars.files_mask){
				req_pars.files_mask.forEach(mask=>{
					this.params.push("-i", mask);
				});
				//@ realize this template: "-filter_complex","[0][1]overlay[v1];[v1][2]overlay[v2]", "-map", "[v2]",
				this.params.push("-filter_complex");
				const steps = req_pars.files_mask.length-1;
				for(let i=0; i<steps; i++){
					let in_ch = (i==0)? i : "v"+i; //0, 1
					let next = (i+1); //1, 2
					let out_ch = "v"+next; //v1, v2
					let overlay_option = "["+in_ch+"]["+next+"]overlay["+out_ch+"]";
					if(next<steps){overlay_option += ";"}
					if(next==steps){
						this.params.push("-map", "["+out_ch+"]");
					}
				}
				//@finally output name and rewrite old
				const id = req_pars.id||("unknown_id"+this.unknown_id_counter++)
				this.params.push("-y", "out_"+id+".mp4");
			}
			//@ Will: array of arrays of strings - names of files
			
			else{console.error("PreparedParams: missing 'files_mask' param")}
		}else{console.error("PreparedParams: missing requested params argument")}
		return this;
	}
	function check_members_of_one_length(members){
		const res = {};
		let longest = 0;
		members.forEach(memb=>{
			if(memb.length > longest){longest = memb.length}
		})
		members.forEach(memb=>{
			if(memb.length==1){
				for(let i =1; i<longest; i++){
					memb.push(memb[0])
				}
			}
			else{
				if(memb.length != longest){res.err = "if a member has langth grater than 1 all members whose length is greater than 1 must have this length."}
			}
		})
		return res;
	}
	function prepare_txt_list(arr, order_number){
		let str = "";
		const for_eol_len = arr.length-1;
		arr.forEach((el, index)=>{
			str += "file " + el;
			if(index < for_eol_len){str += os.EOL}
		})
		const listname = "list"+order_number+".txt";
		fs.writeFileSync(listname, str);
		return listname;
	}
	
	function add_filter_complex(arr_of_layers){
		const params = []
		params.push("-filter_complex");
		const steps = arr_of_layers.length-1;
		let overlay_option_full = "";
		let final_ch = "";
		for(let i=0; i<steps; i++){
			let in_ch = (i==0)? i : "v"+i; //0, 1
			let next = (i+1); //1, 2
			let out_ch = "v"+next; //v1, v2
			final_ch = out_ch;
			let overlay_option = "["+in_ch+"]["+next+"]overlay["+out_ch+"]";
			if(next<steps){overlay_option += ";"}
			overlay_option_full += overlay_option;
			//if(next==steps){params.push("-map", "["+out_ch+"]");}
		}
		params.push(overlay_option_full);
		params.push("-map", "["+final_ch+"]");
		return params;
	}
}
