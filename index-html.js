let frames;
const K = 3;

const animations = {};
let animation = "idle", animationProgress = 0;
`0 60 startup idle
55 90 idle
130 160 walk_forward
165 195 walk_backward
202 220 punch_light idle
240 280 punch_heavier idle
285 350 combo_one idle
360 440 kick idle
450 465 jump idle
450 480 jump_w_land idle
480 640 kick_multi__mid_weird kick_spin
840 940 kick_spin idle
945 965 walk_backward_two__bad
1000 1020 crouch_start crouch_idle
1020 1030 crouch_idle
1030 1070 crouch_kick crouch_idle
1080 1150 crouch_end__kick_included idle
1320 1350 crouch_end idle
1350 1420 idle_taunt idle
1430 1465 stagger_1 idle
5 60 stagger_2 idle
1460 1560 knockback idle
1560 1605 block_start block_hold__alternatively_freeze
1603 1608 block_hold__alternatively_freeze
1605 1635 block_end idle
1640 1720 die_start die_loop
1720 1770 die_loop
0 5 __victory
2 5 __floss`.split('\n').forEach(line => {
	let [start, end, name, next] = (line+' ?').split(' ');
	start = Math.ceil(start/K)*K;

	if(next == "?") next = name;
	animations[name] = { start, end, next };

	const b = document.createElement('button');
	b.innerText = name;
	b.addEventListener('click', () => {
		animation = name;
		// animationProgress = 0;
		animationProgress = animations[animation].start;
	});
	// document.body.append(b);
});

function preload() {
	frames = {};
	frames.nate = [...new Array(Math.min(1000*K, 1770))].map((_,i) => 
		i % K == 0 &&
		loadImage(`./nate-fullanphufightsource/pred_${i.toString().padStart(8,'0')}-out.png`)
	);
	frames.saachin = [...new Array(Math.min(1000*K, 1770))].map((_,i) => 
		i % K == 0 &&
		loadImage(`./saachin-fullanphufight/pred_${i.toString().padStart(8,'0')}-out.png`)
	);

	// console.log(frames.length);

	const b = document.createElement('button');
	b.innerText = "restart";
	b.addEventListener('click', restart);
	document.body.append(b);
}
function setup() {
	createCanvas(800, 400);
	imageMode(CENTER);
	textAlign(CENTER, CENTER);
}
let keys = [];
let scoreupdate = 0;
function keyPressed(){ fighters[0].keys[keyCode] = true; console.log(keyCode);if(keyCode ===32)restart(); }
function keyReleased(){ fighters[0].keys[keyCode] = false; }

let fighters;
class Fighter {
	static Left = 0;
	static Right = 800;
	static Bottom = 200;
	static GRAVITY = 1;
	static DRAG = 0.4;
	static HB_WIDTH = 150;
	static HB_HEIGHT = 200;
	constructor(type, sprite, x=400){
		this.type = type;
		this.actor = sprite;

		this.setup(x);
		this.dies = 0;
	}
	setup(x=400){
		this.x = x;
		this.y = 0;
		this.yo = 0;
		this.flip = false;
		this.nflip = false;
		this.vx = 0;
		this.vy = 0;
		this.state = "startup";
		this.nextState = null;
		this.progress = 0;
		this.duration = 1;
		this.floored = false;

		this.keys = [];

		this.hpd = this.hp = this.mhp = 200;
		this.damage = 0;
		this.damageReach = 0;
	}
	draw(){
		this.process();
		this.x += this.vx;
		this.y += this.vy;
		if(this.x > Fighter.Right){
			this.x = Fighter.Right;
			this.vx = 0;
		}
		if(this.x < Fighter.Left){
			this.x = Fighter.Left;
			this.vx = 0;
		}
		if(this.y > Fighter.Bottom){
			this.y = Fighter.Bottom;
			this.vy = 0;
		}else this.vy += Fighter.GRAVITY;
		this.vx = this.vx - Math.min(Fighter.DRAG, Math.max(-Fighter.DRAG, this.vx));
		this.floored = this.y >= Fighter.Bottom;


		push();
		fill(0);
		// if(this.yo) console.log(this.yo)
		translate(this.x, this.y + this.yo);

		let animation = this.state;
		let next = this.nextState || animations[animation].next;
		let animationProgress = this.progress + animations[animation].start;
		text(animation + "->" + next, 0, -150);
		text(animationProgress-animations[animation].start, 0, -125);
		// animationProgress ++;


		this.hpd += (this.hp - this.hpd) / 30;
		noStroke();
		fill(100,50,0); rect(-50, 100, Math.max(0, this.hpd)/this.mhp*100, 20);
		fill(200,100,0); rect(-50, 100, Math.max(0, this.hp)/this.mhp*100, 20);


		scale(this.flip ? -1 : 1, 1);
		if(animationProgress in frames[this.actor]) image(frames[this.actor][Math.floor(animationProgress/K)*K] || frames[this.actor][0], 0, 0);
		pop();
	}
	process(){
		if(this.type === "player" || this.type === "bot") this.handleInputs();
		for(let f of fighters){
			if(f === this || !f.damage || this.hp <= 0) continue;
			if(Math.abs(f.x-this.x) < Fighter.HB_WIDTH+f.damageReach && Math.abs(f.y-this.y) < Fighter.HB_HEIGHT){
				if(f.damage){
					this.hp -= f.damage; // take damage
					if(f.damage < 15) this.updateState("stagger_1"); // staggers
					else if(f.damage < 30) this.updateState("stagger_2");
					else this.updateState("knockback");
					this.vx = ((f.x > this.x) ? -1 : 1) * ({
						"stagger_1": 3,
						"stagger_2": 5,
						"knockback": 7
					}[this.state]);
					this.flip = this.vx > 0;
					if(this.hp <= 0){
						this.updateState("die_start"); // kys
						scoreupdate = frameCount;
						if(true||this.type==="bot") fighters[fighters.indexOf(this)] = new Fighter(this.type, this.actor, 750)
					}
					f.setDamage(0); // accept damage (only one instance)
				}
			}
		}

		this.damage = 0;
		this.yo = 0;
		switch(this.state){
			case "startup": if(!this.floored) this.progress = 0; break;
			case "idle": break;
			case "walk_forward":  if(this.keys[68]) this.vx = Math.min( 5, this.vx+(0.6+Fighter.DRAG)); this.flip=this.nflip = false; break;
			case "walk_backward": if(this.keys[65]) this.vx = Math.max(-5, this.vx-(0.6+Fighter.DRAG)); this.flip=this.nflip = true;  break;
			case "jump": if(!this.progress) this.vy = -15;  this.flip = this.nflip; break;
			case "punch_light":   if(!this.progress) this.setDamage( 5, -10);  break;
			case "punch_heavier": if(!this.progress) this.setDamage(10);  break;
			case "combo_one":     if(!this.progress) this.setDamage(12);  
							      if(this.progress === 50) this.setDamage(20);  break;
			case "kick_spin":     if(this.progress === 20 || this.progress === 40) this.setDamage(32, 20);  break;
			// case "crouch_kick":
			case "crouch_start":
			case "knockback": 	  this.yo = 45*(this.progress/this.duration)**0.5; break;
			case "die_start": 	  this.yo = 80*(this.progress/this.duration)**0.5; break;
			case "crouch_end__kick_included": if(this.progress===30) this.setDamage(50, 50);
			case "crouch_end":    this.yo = 45*(1-this.progress/this.duration)**3; break;
			case "crouch_idle":   this.yo = 45; break;
			case "die_loop":      this.yo = 80; break;
			// case "crouch"
		}
		this.progress ++;
		const currentAnimation = animations[this.state];
		if(this.progress >= currentAnimation.end-currentAnimation.start){
			this.updateState(this.nextState || currentAnimation.next)
		}
	}
	handleInputs(){
		const F = 70;
		const G = 71;

		if(this.type === "bot"){
			const p = fighters[0];
			const d = Math.abs(this.x-p.x);
			this.keys = [];
			if(d < Fighter.HB_WIDTH-10) this.keys[F] = true;
			else if(d < Fighter.HB_WIDTH+50) this.keys[G] = true;
			else if(this.x > p.x) this.keys[65] = true;
			else if(this.x < p.x) this.keys[68] = true;
			if(p.y < this.y - 10) this.keys[87] = true;
			// console.log(this.keys);
		}
		
		let attacksAllowed = false;
		switch(this.state){
			case "idle":
				let floorcheck = this.floored;
				if(this.keys[65] && floorcheck) this.updateState("walk_backward", true);
				if(this.keys[68] && floorcheck) this.updateState("walk_forward", true);
				if(this.keys[87] && floorcheck) this.updateState("jump");
				attacksAllowed = true;
				break;
			case "walk_backward":
				if(!this.progress && !this.keys[65]) this.updateState("idle");
				if(this.keys[87]) this.updateState("jump");
				attacksAllowed = true;
				break;
			case "walk_forward":
				if(!this.progress && !this.keys[68]) this.updateState("idle");
				if(this.keys[87]) this.updateState("jump");
				attacksAllowed = true;
				break;
			case "crouch_idle":
				if(!this.progress && !this.keys[83]) this.updateState("crouch_end");
				if(!this.progress && this.keys[F]) this.updateState("crouch_end__kick_included");
				if(this.keys[87]) this.updateState("jump");
				break;
			case "punch_light":  if(this.keys[F] && this.progress > 10) this.updateState("punch_heavier"); break;
			case "punch_heavier":if(this.keys[F] && this.progress > 30) this.updateState("combo_one"); break;
		}
		if(attacksAllowed){
			if(this.keys[83]) this.updateState("crouch_start");
			if(this.keys[F]) this.updateState("punch_light");
			if(this.keys[G]) this.updateState("kick_spin");
		}
	}
	setDamage(x, dr=0){
		this.damage = x;
		this.damageReach = dr;
		this.flip = this.nflip;
	}
	updateState(state, loop){
		this.state = state;
		this.nextState = (loop===true ? this.state : loop) || null;
		this.progress = 0;
		this.duration = animations[state].end - animations[state].start;
	}
}

function restart(){
	fighters = [...new Array(2)].map((_,i,a) => new Fighter(i?"bot":"player", i?"saachin":"nate", 200+(600/(a.length-1))*i))
}
restart();
function draw(){
	background(200);
	for(const f of fighters) f.draw();
}