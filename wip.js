// wait for the pixel font to load, then start the game
document.fonts.load('16px "Press Start 2P"').finally(startGame);

function startGame () {
  // make the canvas (the font option makes ALL text pixelated)
  kaplay({
    width: 900,
    height: 540,
    background: [20, 10, 40],
    crisp: true,
    font: "'Press Start 2P', monospace"
  });

  // load the files from the repo
  loadSprite("box", "blind_boxes/box1.png");
  loadSprite("card", "blind_boxes/card1.png");
  loadSprite("pack", "tcg-packs/spacePack.png");
  loadSound("casino", "sounds/casino_ambiance.mp3");

  // the slot symbols sheet: 5 pictures in one row (duck, gem, bow, coin, egg)
  loadSprite("symbols", "ducks/symbols.png", {
    sliceX: 5
  });

  // the duck sprite sheet: 6 pictures across, 5 rows down (each picture is 64x64)
  // each row is one animation: "from" and "to" are picture numbers (counting from 0)
  loadSprite("duck", "ducks/duck_spritesheet.png", {
    sliceX: 6,
    sliceY: 5,
    anims: {
      idle: {
        from: 0,
        to: 5,
        loop: true,
        speed: 4
      }, // standing still
      left: {
        from: 6,
        to: 11,
        loop: true,
        speed: 10
      }, // walking left
      right: {
        from: 12,
        to: 17,
        loop: true,
        speed: 10
      }, // walking right
      jump: {
        from: 18,
        to: 23,
        speed: 12
      }, // hop
      happy: {
        from: 24,
        to: 29,
        loop: true,
        speed: 8
      }, // celebrate
    },
  });



  // PART 1: SHARED GAME STATE (every screen uses these)

  let coins = 100; // the player's money
  let music = null; // the background music (lives outside the scenes so it keeps playing)



  // PART 2: SOUND SLOTS
  // Put a file path between the quotes to turn a sound on.
  // Leave "" and that sound is just silent (nothing breaks).

  const SOUND_FILES = {
    gong: "sounds/shinese-gong.mp3", // when you press PLAY
    spin: "", // loops while the reels spin  
    reelStop: "", // a little click each time a reel stops
    win: "sounds/money-soundfx.mp3", // a pair, or 3 of a kind
    jackpot: "sounds/here-come-the-money-casinoze.mp3", // 3 ducks!
    lose: "sounds/downer_noise.mp3", // no luck
    betUp: "", // the bet  +  button
    betDown: "", // the bet  -  button
  };

  // load every sound that has a file
  for (const name in SOUND_FILES) {
    if (SOUND_FILES[name] !== "") loadSound(name, SOUND_FILES[name]);
  }

  // play a sound by name (does nothing if the slot is empty)
  function playSound (name, options) {
    if (SOUND_FILES[name] === "") return null;
    return play(name, options);
  }


  // PART 3: HELPER FUNCTIONS (buttons, signs, machines, the duck)

  // a simple button: a colored rectangle with text on top
  function makeButton (words, x, y, w, h, btnColor, action) {
    const button = add([rect(w, h), pos(x, y), anchor("center"), color(btnColor), area()]);
    const label = add([text(words, {
      size: 16
    }), pos(x, y), anchor("center")]);
    button.onClick(action);
    return label;
  }

  // background music: turn it on / off
  function startMusic () {
    if (!music) music = play("casino", {
      loop: true
    });
  }

  function stopMusic () {
    if (music) {
      music.stop();
      music = null;
    }
  }

  // the music ON / OFF switch (used on every screen). Click it, or press M.
  function makeMusicSwitch (x, y) {
    add([text("MUSIC", {
      size: 12
    }), pos(x - 85, y), anchor("center"), color(255, 255, 255)]);
    const track = add([rect(90, 36), pos(x, y), anchor("center"), color(60, 60, 120), outline(3, rgb(255, 255, 255)), area()]);
    const knob = add([rect(28, 28), pos(x, y), anchor("center"), color(255, 255, 255)]);
    const word = add([text("", {
      size: 12
    }), pos(x, y), anchor("center"), color(255, 255, 255)]);

    // show the switch the right way round
    function refresh () {
      if (music) {
        track.color = rgb(70, 160, 90);
        knob.pos.x = x + 22;
        word.pos.x = x - 14;
        word.text = "ON";
      } else {
        track.color = rgb(60, 60, 120);
        knob.pos.x = x - 22;
        word.pos.x = x + 14;
        word.text = "OFF";
      }
    }

    function toggle () {
      if (music) stopMusic();
      else startMusic();
      refresh();
    }

    track.onClick(toggle);
    onKeyPress("m", toggle);
    refresh();
  }

  // a neon sign: dark box with a glowing outline and text
  function makeSign (words, x, y, signColor) {
    add([rect(230, 50), pos(x, y), anchor("center"), color(20, 10, 40), outline(4, signColor)]);
    add([text(words, {
      size: 20
    }), pos(x, y), anchor("center"), color(signColor)]);
  }

  // an arcade machine. spriteName = picture on its screen,
  // action = what happens when the duck presses SPACE
  function makeCabinet (x, words, spriteName, spriteScale, bodyColor, action, screenWords = "?") {
    // body
    add([rect(170, 250), pos(x, 270), anchor("center"), color(bodyColor), outline(4, rgb(255, 80, 200))]);
    // top sign
    add([rect(170, 34), pos(x, 162), anchor("center"), color(20, 10, 40), outline(4, rgb(90, 220, 255))]);
    add([text(words, {
      size: 12
    }), pos(x, 162), anchor("center"), color(90, 220, 255)]);
    // screen
    add([rect(130, 120), pos(x, 255), anchor("center"), color(10, 10, 30), outline(4, rgb(90, 220, 255))]);
    if (spriteName) {
      add([sprite(spriteName), pos(x, 255), anchor("center"), scale(spriteScale)]);
    } else {
      add([text(screenWords, {
        size: 24
      }), pos(x, 255), anchor("center"), color(255, 214, 102)]);
    }
    // controls
    add([rect(150, 36), pos(x, 345), anchor("center"), color(60, 50, 120)]);
    add([circle(8), pos(x - 30, 345), color(255, 60, 160)]);
    add([circle(8), pos(x + 30, 345), color(90, 220, 255)]);

    // remember where this machine is, so the duck can find it
    return {
      x: x,
      action: action
    };
  }



  function makeDuck (x, y) {
    return add([sprite("duck", {
      anim: "idle"
    }), pos(x, y), anchor("bot"), scale(1.3), z(10)]);
  }


  // PART 4: SLOT MACHINE DATA + SYMBOLS

  // The rules (kept simple):
  //   3 ducks  = bet x 25   (JACKPOT)
  //   3 of anything else  = bet x 5
  //   any 2 the same  = you get your bet back (x1)

  const SYMBOLS = ["duck", "gem", "bow", "coin", "egg"];
  const BET_STEPS = [5, 10, 25, 50, 100]; // the bets you can pick
  let betIndex = 1; // starts at 10

  // pick any symbol at random
  function randomSymbol () {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  // look at the 3 reels: how many times your bet you win, what to say, and which sound to play
  function getPayout (reels) {
    const a = reels[0];
    const b = reels[1];
    const c = reels[2];

    if (a === b && b === c) {
      if (a === "duck") return {
        times: 25,
        text: "3 DUCKS! JACKPOT x25",
        sound: "jackpot"
      };
      return {
        times: 5,
        text: "3 " + a.toUpperCase() + "S! x5",
        sound: "win"
      };
    }
    if (a === b || b === c || a === c) {
      return {
        times: 1,
        text: "PAIR! BET BACK",
        sound: "win"
      };
    }
    return {
      times: 0,
      text: "NO LUCK",
      sound: "lose"
    };
  }

  // one reel symbol= one picture from the symbols sheet
  // (frame number = its place in the SYMBOLS list above)
  function makeSymbol (name, x, y) {
    return add([sprite("symbols", {
      frame: SYMBOLS.indexOf(name)
    }), pos(x, y), anchor("center"), scale(2), z(5)]);
  }


  // SCREEN 1: START PAGE

  scene("start", () => {
    const title = add([text("DUCK CASINO", {
      size: 48
    }), pos(450, 70), anchor("center"), color(255, 80, 200), opacity(1)]);
    add([text("~ the quack box casino ~", {
      size: 16
    }), pos(450, 125), anchor("center"), color(90, 220, 255)]);
   

    add([sprite("box"), pos(170, 300), anchor("center"), scale(2)]);
    add([sprite("pack"), pos(450, 300), anchor("center"), scale(0.45)]);
    add([sprite("card"), pos(730, 300), anchor("center"), scale(2)]);

    makeButton("PLAY", 450, 490, 200, 50, rgb(236, 64, 160), () => {
      playSound("gong");
      startMusic(); // music starts here
      go("lobby");
    });
    makeMusicSwitch(790, 500);
  });



  // SCREEN 2: THE CASINO FLOOR (walk around!)

  scene("lobby", () => {
    // back wall
    add([rect(900, 230), pos(0, 0), color(25, 20, 70)]);
    add([rect(900, 8), pos(0, 0), color(90, 220, 255)]);

    // signs on the wall
    makeSign("CASINO", 150, 70, rgb(255, 80, 200));
    makeSign("ARCADE", 750, 70, rgb(90, 220, 255));
    add([text("COINS: " + coins, {
      size: 14
    }), pos(450, 30), anchor("center"), color(255, 214, 102)]);
    add([text("WALK UP TO A MACHINE", {
      size: 14
    }), pos(450, 62), anchor("center"), color(255, 214, 102)]);
    add([text("ARROWS / WASD + SPACE", {
      size: 12
    }), pos(450, 90), anchor("center"), color(90, 220, 255)]);

    // checkered floor
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 15; col++) {
        const dark = (row + col) % 2 === 0;
        add([rect(60, 60), pos(col * 60, 230 + row * 60), color(dark ? rgb(20, 40, 110) : rgb(30, 60, 150))]);
      }
    }

    // the machines: only DUCK SLOTS works so far, the other three are empty spots for new games
    // (to add a game later: change a "COMING SOON" line to makeCabinet(x, "NAME", null, 0, rgb(40, 30, 100), () => go("scene-name"), "?") and add that machine to the machines list)
    const slotMachine = makeCabinet(130, "DUCK SLOTS", null, 0, rgb(40, 30, 100), () => go("slots"), "777");
    makeCabinet(340, "COMING SOON", null, 0, rgb(50, 50, 60), null);
    makeCabinet(550, "COMING SOON", null, 0, rgb(50, 50, 60), null);
    makeCabinet(760, "COMING SOON", null, 0, rgb(50, 50, 60), null);
    const machines = [slotMachine];

    // the duck + the message that pops up when it is next to a machine
    const duck = makeDuck(450, 505);
    let facing = "left"; // the sprite sheet duck starts out looking left
    let currentAnim = "idle";

    // switch animation, but only when it is a NEW one (so it doesn't restart every frame)
    function setAnim (name) {
      if (currentAnim === name) return;
      duck.play(name);
      currentAnim = name;
    }

    const prompt = add([text("PRESS SPACE", {
      size: 12
    }), anchor("center"), color(255, 214, 102), z(20)]);
    let near = null;

    onUpdate(() => {
      // which keys are held?
      let dx = 0;
      let dy = 0;
      if (isKeyDown("left") || isKeyDown("a")) dx = -1;
      if (isKeyDown("right") || isKeyDown("d")) dx = 1;
      if (isKeyDown("up") || isKeyDown("w")) dy = -1;
      if (isKeyDown("down") || isKeyDown("s")) dy = 1;

      // move the duck, but keep it on the floor in front of the machines
      duck.pos.x = clamp(duck.pos.x + dx * 200 * dt(), 30, 870);
      duck.pos.y = clamp(duck.pos.y + dy * 200 * dt(), 420, 505);

      // pick the walking animation (the sheet has a left row and a right row)
      if (dx < 0) facing = "left";
      if (dx > 0) facing = "right";
      const moving = dx !== 0 || dy !== 0;
      if (moving) {
        duck.flipX = false;
        setAnim(facing); // "left" or "right" animation
      } else {
        setAnim("idle");
        duck.flipX = facing === "right"; // the idle row looks left, so flip it to look right
      }

      // is the duck close to a machine?
      near = null;
      for (const m of machines) {
        if (duck.pos.dist(vec2(m.x, 400)) < 70) near = m;
      }
      prompt.hidden = near === null;
      prompt.pos = vec2(duck.pos.x, duck.pos.y + 20);
    });

    onKeyPress("space", () => {
      if (near) near.action();
    });

    makeButton("BACK", 80, 520, 130, 32, rgb(60, 60, 120), () => go("start"));
    makeMusicSwitch(790, 520);
  });

  // SCREEN 3: DUCK SLOTS

  scene("slots", () => {
    add([text("DUCK SLOTS", {
      size: 28
    }), pos(450, 45), anchor("center"), color(255, 80, 200)]);

    // the machine frame + three reel windows
    add([rect(540, 230), pos(450, 205), anchor("center"), color(30, 20, 80), outline(6, rgb(255, 80, 200))]);
    const reelX = [310, 450, 590];
    const reelY = 205;
    for (const x of reelX) {
      add([rect(130, 170), pos(x, reelY), anchor("center"), color(245, 240, 225), outline(4, rgb(90, 220, 255))]);
    }

    // little arrows pointing at the winning line
    add([polygon([vec2(0, -12), vec2(18, 0), vec2(0, 12)]), pos(190, reelY), color(255, 214, 102)]);
    add([polygon([vec2(0, -12), vec2(-18, 0), vec2(0, 12)]), pos(710, reelY), color(255, 214, 102)]);

    // what each reel is showing right now
    const shown = [null, null, null];

    function showSymbol (i, name) {
      if (shown[i]) destroy(shown[i]);
      shown[i] = makeSymbol(name, reelX[i], reelY);
    }
    showSymbol(0, "duck");
    showSymbol(1, "coin");
    showSymbol(2, "egg");

    // the text on screen
    const message = add([text("PRESS SPIN!", {
      size: 16
    }), pos(450, 350), anchor("center"), color(255, 214, 102)]);
    const coinText = add([text("", {
      size: 16
    }), pos(150, 400), anchor("center"), color(255, 214, 102)]);
    const winText = add([text("LAST WIN: 0", {
      size: 16
    }), pos(750, 400), anchor("center"), color(90, 220, 255)]);
    const betText = add([text("", {
      size: 16
    }), pos(450, 460), anchor("center"), color(255, 255, 255)]);

    function updateHud () {
      coinText.text = "COINS: " + coins;
      betText.text = "BET " + BET_STEPS[betIndex];
    }
    updateHud();

    //bet + and -
    function changeBet (direction) {
      if (spinning) return;
      const newIndex = clamp(betIndex + direction, 0, BET_STEPS.length - 1);
      if (newIndex === betIndex) return;
      betIndex = newIndex;
      playSound(direction > 0 ? "betUp" : "betDown");
      updateHud();
    }

    //spinning
    let spinning = false;
    let spinSound = null;

    function spin () {
      if (spinning) return;

      const bet = BET_STEPS[betIndex];
      if (coins < bet) {
        message.text = "NOT ENOUGH COINS";
        message.color = rgb(255, 90, 90);
        return;
      }

      coins -= bet;
      updateHud();
      spinning = true;
      message.text = "SPINNING...";
      message.color = rgb(90, 220, 255);
      spinSound = playSound("spin", {
        loop: true
      });

      // decide the result first
      const reels = [randomSymbol(), randomSymbol(), randomSymbol()];

      // each reel flickers, then stops on its real symbol (one after the other)
      for (let i = 0; i < 3; i++) {
        const flicker = loop(0.08, () => showSymbol(i, randomSymbol()));
        wait(1 + i * 0.7, () => {
          flicker.cancel();
          showSymbol(i, reels[i]);
          playSound("reelStop");
        });
      }

      // once the last reel has stopped, pay out
      wait(2.5, () => finish(reels, bet));
    }

    function finish (reels, bet) {
      spinning = false;
      if (spinSound) {
        spinSound.stop();
        spinSound = null;
      }

      const result = getPayout(reels);
      const winnings = result.times * bet;
      coins += winnings;
      winText.text = "LAST WIN: " + winnings;

      if (winnings > 0) {
        message.text = result.text + "  +" + winnings;
        message.color = rgb(255, 214, 102);
      } else {
        message.text = result.text;
        message.color = rgb(255, 90, 160);
      }
      playSound(result.sound); // money / jackpot / downer

      // if you are broke, here is a free refill
      if (coins < BET_STEPS[0]) {
        coins += 50;
        message.text = "OUT OF COINS! +50 FREE";
      }
      updateHud();
    }

    //buttons
    makeButton("SPIN", 450, 400, 300, 50, rgb(236, 64, 160), spin);
    makeButton("-", 350, 460, 50, 44, rgb(60, 60, 120), () => changeBet(-1));
    makeButton("+", 550, 460, 50, 44, rgb(60, 60, 120), () => changeBet(1));
    onKeyPress("space", spin);

    makeButton("BACK", 80, 520, 130, 32, rgb(60, 60, 120), () => {
      if (!spinning) go("lobby"); // can't leave in the middle of a spin
    });
    makeMusicSwitch(790, 520);
  });

  go("start");
}