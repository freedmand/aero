import * as PIXI from "pixi.js";
import { formatTime } from "./format";
import { getDistance, lerp, milePaceToMps, mpsToRpm } from "./math";
import { Card } from "./deck";

const localStorageKey = "AERO_GAME";

export class Aero {
  readonly app: PIXI.Application<HTMLCanvasElement>;
  readonly runnerSpriteSheet: PIXI.Spritesheet;
  readonly numberSpriteSheet: PIXI.Spritesheet;
  readonly trackSprite: PIXI.Sprite;
  readonly middleTreesSprite: PIXI.Sprite;
  readonly backgroundSprite: PIXI.Sprite;
  readonly headerSprite: PIXI.Sprite;

  readonly gameDistance = 200;

  readonly numLanes = 4;
  readonly laneOffset = 0;
  readonly playerOffset = 0;
  readonly runnerXOffset = -31;
  readonly runnerYOffset = -57;
  readonly laneTileOffset = 315;
  readonly gearRatio = 2116.0 / 225.0;
  readonly maxRPM = 200;
  readonly minInterval = 60 / (this.maxRPM * this.gearRatio);

  public rep = 0;

  public lanes: PIXI.TilingSprite[];
  public runners: PIXI.Sprite[];
  public middleTrees: PIXI.TilingSprite;
  public background: PIXI.TilingSprite;
  public header: PIXI.TilingSprite;
  public distanceText: PIXI.BitmapText;
  public timeText: PIXI.BitmapText;
  public questionText: PIXI.BitmapText;
  public answerText: PIXI.BitmapText;

  public runnerPositions: number[];
  public runnerSpeeds: (number | null)[] = [
    null,
    100 / 45,
    // milePaceToMps(4),
    milePaceToMps(6),
    milePaceToMps(8),
  ];
  public runnerRevolutions: number[];
  readonly distanceFactor = 0.8;
  public startTime = 0;
  public done = false;
  readonly doneDuration = 3;
  public finishTime = 0;

  public debugContainer: PIXI.Container;
  public splitsContainer: PIXI.Container;
  readonly splitsOffsetX = 240;
  readonly splitsOffsetY = 20;
  readonly splitInterval = 50; // meters
  public currentSplit = 0;
  public splits: number[] = [];

  public rpm = 60;
  public lastPedalTime = 0;
  public lastAbsolutePedalTime = 0;

  readonly screenWidthInMeters = 18.7;
  readonly zeroMetersOffset = 23;
  readonly bottomPadding = 10;
  readonly edgeSize = 3;
  readonly laneFill = "#E8D8D8";
  readonly halfMarkingFill = "#B5B5E7";
  readonly minorMarkingFill = "#FAE153";

  public camOffset = 0;
  readonly camOffsetLerp = 0.1;
  readonly runnerLerp = 0.1;

  public deck: Card[] = [];
  public deckIndex = 0;
  readonly deckAdvance = 24;
  readonly answerReveal = 12;
  public lastDeckAdvance = 0;
  readonly pausePedal = 3;

  public pause = this.pausePedal;

  addDeck(cards: Card[]) {
    this.deck = cards;
    this.deckIndex = -1;
    this.advanceDeck();
  }

  advanceDeck() {
    if (this.deck.length === 0) return;
    this.deckIndex++;
    const card = this.deck[this.deckIndex % this.deck.length];
    this.questionText.scale.set(3);
    this.answerText.scale.set(3);

    if (Math.random() < 0.5) {
      this.questionText.text = card.question;
      this.answerText.text = card.answer;
    } else {
      this.answerText.text = card.question;
      this.questionText.text = card.answer;
    }
    this.answerText.alpha = 0;

    // Check if width is too wide
    let answerWidth = this.answerText.width;
    const maxWidth = 400;
    if (
      this.questionText.width > maxWidth ||
      this.answerText.width > maxWidth
    ) {
      this.questionText.scale.set(2);
      this.answerText.scale.set(2);
      if (
        this.questionText.width > maxWidth ||
        this.answerText.width > maxWidth
      ) {
        this.advanceDeck();
        return;
      }
    }

    this.lastDeckAdvance = this.getAbsoluteTime();
  }

  constructor() {
    this.app = new PIXI.Application<HTMLCanvasElement>({
      background: "#3F8F6E",
      width: 480,
      height: 300,
    });

    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;

    // Load sprites and spritesheets
    this.trackSprite = PIXI.Sprite.from("./assets/track.png");
    this.middleTreesSprite = PIXI.Sprite.from("./assets/middle-trees.png");
    this.backgroundSprite = PIXI.Sprite.from("./assets/background.png");
    this.headerSprite = PIXI.Sprite.from("./assets/header.png");

    const heroSpriteTileWidth = 46;
    const heroSpriteTileHeight = 50;

    const heroAtlas: PIXI.ISpritesheetData = {
      frames: {
        still: {
          frame: {
            x: 0,
            y: 0,
            w: heroSpriteTileWidth,
            h: heroSpriteTileHeight,
          },
        },
        run1: {
          frame: {
            x: 0,
            y: heroSpriteTileHeight * 3,
            w: heroSpriteTileWidth,
            h: heroSpriteTileHeight,
          },
        },
        run2: {
          frame: {
            x: heroSpriteTileWidth,
            y: heroSpriteTileHeight * 3,
            w: heroSpriteTileWidth,
            h: heroSpriteTileHeight,
          },
        },
        run3: {
          frame: {
            x: heroSpriteTileWidth * 2,
            y: heroSpriteTileHeight * 3,
            w: heroSpriteTileWidth,
            h: heroSpriteTileHeight,
          },
        },
        run4: {
          frame: {
            x: heroSpriteTileWidth * 3,
            y: heroSpriteTileHeight * 3,
            w: heroSpriteTileWidth,
            h: heroSpriteTileHeight,
          },
        },
        run5: {
          frame: {
            x: heroSpriteTileWidth * 4,
            y: heroSpriteTileHeight * 3,
            w: heroSpriteTileWidth,
            h: heroSpriteTileHeight,
          },
        },
        run6: {
          frame: {
            x: heroSpriteTileWidth * 5,
            y: heroSpriteTileHeight * 3,
            w: heroSpriteTileWidth,
            h: heroSpriteTileHeight,
          },
        },
        run7: {
          frame: {
            x: heroSpriteTileWidth * 6,
            y: heroSpriteTileHeight * 3,
            w: heroSpriteTileWidth,
            h: heroSpriteTileHeight,
          },
        },
        run8: {
          frame: {
            x: heroSpriteTileWidth * 7,
            y: heroSpriteTileHeight * 3,
            w: heroSpriteTileWidth,
            h: heroSpriteTileHeight,
          },
        },
      },
      meta: {
        scale: "1",
      },
      animations: {
        sprint: [
          "run1",
          "run2",
          "run3",
          "run4",
          "run5",
          "run6",
          "run7",
          "run8",
        ],
        jog: ["run1", "run3", "run4", "run5", "run7", "run8"],
      },
    };

    this.runnerSpriteSheet = new PIXI.Spritesheet(
      PIXI.BaseTexture.from("./assets/hero-spritemap.png"),
      heroAtlas
    );

    const numberSpriteTileWidth = 8;
    const numberSpriteTileHeight = 13;

    const numberAtlas: PIXI.ISpritesheetData = {
      frames: {
        lane1: {
          frame: {
            x: 0,
            y: -1,
            w: numberSpriteTileWidth,
            h: numberSpriteTileHeight,
          },
        },
        lane2: {
          frame: {
            x: numberSpriteTileWidth,
            y: -1,
            w: numberSpriteTileWidth,
            h: numberSpriteTileHeight,
          },
        },
        lane3: {
          frame: {
            x: numberSpriteTileWidth * 2,
            y: -1,
            w: numberSpriteTileWidth,
            h: numberSpriteTileHeight,
          },
        },
        lane4: {
          frame: {
            x: numberSpriteTileWidth * 3,
            y: -1,
            w: numberSpriteTileWidth,
            h: numberSpriteTileHeight,
          },
        },
      },
      meta: {
        scale: "1",
      },
    };

    this.numberSpriteSheet = new PIXI.Spritesheet(
      PIXI.BaseTexture.from("./assets/numbers.png"),
      numberAtlas
    );
  }

  async loadAssets() {
    // Load fonts
    await PIXI.Assets.load("./assets/good_neighbors_starling.xml");
    // await PIXI.Assets.load("./assets/GoldPeaberry.xml");

    // Parse spritesheets
    await this.runnerSpriteSheet.parse();
    await this.numberSpriteSheet.parse();
  }

  addToDOM() {
    document.body.appendChild(this.app.view);
  }

  finalize() {
    const topTrackY = this.buildTrack(false);
    this.addBackground(topTrackY);
    this.addDebugLabels();
    this.buildTrack(true);
    this.addRunners();

    this.questionText = this.addText("", 240, 60, 3, "center");
    this.questionText.tint = 0x00ff00;
    this.answerText = this.addText("", 240, 109, 3, "center");
    this.answerText.tint = 0xffff00;

    this.distanceText = this.addText("0", 460, 20, 2, "right");
    this.distanceText.anchor.set(1, 0);
    this.timeText = this.addText("0", 20, 20, 2, "left");

    this.splitsContainer = new PIXI.Container();
    this.app.stage.addChild(this.splitsContainer);

    this.reset();
    this.app.ticker.add(() => this.gameLoop());
  }

  addDebugLabels(meterStart = 0, meterEnd = 200) {
    this.debugContainer = new PIXI.Container();
    for (let meter = meterStart; meter <= meterEnd; meter += 1) {
      const [x, y] = this.metersToCoord(meter, this.numLanes);
      // this.addText(
      //   `${meter}`,
      //   x,
      //   Math.round(y) - 20,
      //   1,
      //   "center",
      //   this.debugContainer
      // );

      // Draw line
      if (meter % 10 === 0) {
        // if (true) {
        const line = new PIXI.Graphics();
        line.lineStyle({
          width: meter % 100 === 0 ? 3 : 1,
          color:
            meter % 100 === 0
              ? this.laneFill
              : meter % 50 === 0
              ? this.halfMarkingFill
              : this.minorMarkingFill,
          cap: PIXI.LINE_CAP.ROUND,
        });
        line.moveTo(x, Math.floor(y));
        const [startX, startY] = this.metersToCoord(meter, 0);
        line.lineTo(startX, Math.ceil(startY));
        this.debugContainer.addChild(line);
      }

      if ((meter + 100) % 100 === 0) {
        // Draw number
        for (let lane = 0; lane < this.numLanes; lane++) {
          const number = this.numLanes - lane;
          const numberSprite = new PIXI.Sprite(
            this.numberSpriteSheet.textures[`lane${number}`]
          );
          const [x, y] = this.metersToCoord(meter, lane);
          numberSprite.x = x - 15;
          numberSprite.y = y - 19;
          // this.app.stage.addChild(numberSprite);
          this.debugContainer.addChild(numberSprite);
        }
      }
    }
    this.app.stage.addChild(this.debugContainer);
  }

  addText(
    text: string,
    x: number,
    y: number,
    scale: number,
    align: PIXI.TextStyleAlign = "left",
    parent: PIXI.Container = this.app.stage,
    fontName = "GoodNeighbors"
  ): PIXI.BitmapText {
    const bitmapFontText = new PIXI.BitmapText(text, {
      fontName,
      fontSize: 16,
      align,
    });
    if (align === "center") {
      bitmapFontText.anchor.set(0.5, 0);
    }
    bitmapFontText.x = x;
    bitmapFontText.y = y;
    bitmapFontText.scale.set(scale);
    parent.addChild(bitmapFontText);

    return bitmapFontText;
  }

  buildTrack(innerLinesOnly = false, scale = 1): number {
    let yOffset = this.app.screen.height - this.bottomPadding;

    // Draw bottom line
    let graphics: PIXI.Graphics;
    if (innerLinesOnly) {
      graphics = new PIXI.Graphics();
      graphics.beginFill(this.laneFill);
      graphics.drawRect(
        0,
        yOffset - this.edgeSize,
        this.app.screen.width,
        this.edgeSize
      );
    }

    yOffset -= this.edgeSize;

    if (!innerLinesOnly) {
      this.lanes = [];
    }

    for (let i = 0; i < this.numLanes; i++) {
      if (!innerLinesOnly) {
        const lane = new PIXI.TilingSprite(
          this.trackSprite.texture,
          this.app.screen.width / scale,
          this.trackSprite.height
        );
        lane.tilePosition.x = i * this.laneOffset;
        lane.scale.set(scale);
        lane.y = yOffset - lane.height * scale;
        this.lanes.unshift(lane);
        this.app.stage.addChild(lane);
      }
      yOffset -= this.trackSprite.height * scale;

      // Draw line
      if (innerLinesOnly) {
        graphics!.drawRect(
          0,
          yOffset - this.edgeSize,
          this.app.screen.width,
          this.edgeSize
        );
      }
      yOffset -= this.edgeSize;
    }
    if (innerLinesOnly) {
      this.app.stage.addChild(graphics!);
    }

    // Draw track marking
    // const line = new PIXI.Graphics();
    // line.lineStyle({
    //   width: 3,
    //   color: this.laneFill,
    //   cap: PIXI.LINE_CAP.ROUND,
    // });
    // line.moveTo(
    //   this.zeroMetersOffset + this.laneOffset * this.numLanes,
    //   yOffset + this.edgeSize - 1
    // );
    // line.lineTo(this.zeroMetersOffset, this.app.screen.height);
    // this.app.stage.addChild(line);

    return yOffset;
  }

  addBackground(
    trackTopY: number,
    middleTreePadding = 10,
    backgroundScale = 1
  ) {
    // Draw background
    this.background = new PIXI.TilingSprite(
      this.backgroundSprite.texture,
      this.app.screen.width / backgroundScale,
      this.backgroundSprite.height
    );
    this.background.scale.set(backgroundScale);
    this.app.stage.addChild(this.background);

    // Draw header
    this.header = new PIXI.TilingSprite(
      this.headerSprite.texture,
      this.app.screen.width / backgroundScale,
      this.headerSprite.height
    );
    this.header.scale.set(backgroundScale);
    this.app.stage.addChild(this.header);

    // Draw middle trees
    this.middleTrees = new PIXI.TilingSprite(
      this.middleTreesSprite.texture,
      this.app.screen.width,
      this.middleTreesSprite.height
    );
    this.middleTrees.y =
      trackTopY - this.middleTrees.height - middleTreePadding;
    this.app.stage.addChild(this.middleTrees);
  }

  metersToCoord(meters: number, lane: number): [number, number] {
    const x =
      this.zeroMetersOffset +
      (meters * this.app.screen.width) / this.screenWidthInMeters +
      this.laneOffset * lane;
    const y =
      this.app.screen.height -
      this.bottomPadding -
      this.edgeSize / 2 -
      (this.trackSprite.height + this.edgeSize) * lane;
    return [x, y];
  }

  updateRunnerPosition(runnerIndex: number, snap = false) {
    const [x, y] = this.metersToCoord(
      this.runnerPositions[runnerIndex] - this.camOffset,
      runnerIndex
    );
    if (snap) {
      this.runners[runnerIndex].x = x + this.runnerXOffset;
    } else {
      this.runners[runnerIndex].x = lerp(
        this.runners[runnerIndex].x,
        x + this.runnerXOffset,
        this.runnerLerp
      );
    }
    this.runners[runnerIndex].y = y + this.runnerYOffset;
  }

  addRunners(scale = 1) {
    this.runners = [];
    this.runnerPositions = [];
    this.runnerRevolutions = [];

    for (let i = 0; i < this.lanes.length; i++) {
      const runner = new PIXI.Sprite(this.runnerSpriteSheet.textures["still"]);
      runner.scale.set(scale);

      if (i !== 0) {
        // Set tint
        runner.alpha = 0.5;
      }
      this.runners.push(runner);
      this.runnerPositions.push(0);
      this.runnerRevolutions.push(0);
    }
    for (let i = this.runners.length - 1; i >= 0; i--) {
      this.app.stage.addChild(this.runners[i]);
    }
    for (let i = 0; i < this.runners.length; i++) {
      this.updateRunnerPosition(i);
    }
  }

  getAbsoluteTime() {
    return this.app.ticker.lastTime / 1000;
  }

  getGameTime() {
    if (this.pause > 0) {
      return 0;
    }
    return this.app.ticker.lastTime / 1000 - this.startTime;
  }

  updateSplits() {
    this.splitsContainer.removeChildren();
    if (this.splits.length === 0) return;
    const split = this.splits[this.splits.length - 1];
    this.addText(
      `${(
        this.splitInterval * this.splits.length
      ).toLocaleString()}m: ${formatTime(split)}`,
      this.splitsOffsetX,
      this.splitsOffsetY,
      2,
      "center",
      this.splitsContainer
    );
  }

  pedal() {
    if (this.pause > 0) {
      this.pause--;
      if (this.pause === 0) {
        this.startTime = this.app.ticker.lastTime / 1000;
      }
      return;
    }
    const newTime = this.getGameTime();
    const absoluteNewTime = this.getAbsoluteTime();

    const delta = absoluteNewTime - this.lastAbsolutePedalTime;
    if (delta < this.minInterval) {
      return;
    }
    const rpm = 60 / delta;
    const distance = getDistance(delta, this.gearRatio);

    this.runnerRevolutions[0] += 1 / this.gearRatio;
    this.runnerPositions[0] += distance;

    const animation = rpm > 45 ? "sprint" : "jog";
    const frames = this.runnerSpriteSheet.animations[animation];
    const frame = Math.floor((this.runnerRevolutions[0] % 1) * frames.length);
    this.runners[0].texture = frames[frame];

    this.lastPedalTime = newTime;
    this.lastAbsolutePedalTime = absoluteNewTime;

    if (this.runnerPositions[0] >= this.currentSplit + this.splitInterval) {
      this.currentSplit += this.splitInterval;
      this.splits.push(newTime);
      this.updateSplits();
    }
  }

  reset() {
    this.done = false;
    this.pause = this.pausePedal;
    this.finishTime = 0;
    this.lastPedalTime = this.startTime;
    for (let i = 0; i < this.runners.length; i++) {
      this.runnerPositions[i] = 0;
      this.runnerRevolutions[i] = 0;
      // Set sprites to still
      this.runners[i].texture = this.runnerSpriteSheet.textures["still"];
      this.updateRunnerPosition(i, true);
    }
    this.updateCam(true);
    for (let i = 0; i < this.runners.length; i++) {
      this.updateRunnerPosition(i, true);
    }

    // Reset splits
    this.currentSplit = 0;
    this.splits = [];
    this.updateSplits();
  }

  updateCam(snap = false) {
    if (snap) {
      this.camOffset = this.runnerPositions[0] - this.screenWidthInMeters / 2;
    } else {
      this.camOffset = lerp(
        this.camOffset,
        this.runnerPositions[0] - this.screenWidthInMeters / 2,
        this.camOffsetLerp
      );
    }
  }

  finishRep() {
    this.rep++;

    // Make one of the runners a ghost
    if (this.splits.length > 0) {
      const lastSplit = this.splits[this.splits.length - 1];
      const splitDistance = this.splitInterval * this.splits.length;
      const runnerIndex = (this.rep % 3) + 1;
      this.runnerSpeeds[runnerIndex] = splitDistance / lastSplit;

      // Append local storage with split time
      localStorage.setItem(
        localStorageKey,
        `${
          localStorage.getItem(localStorageKey) || ""
        }\n${splitDistance.toLocaleString()}m: ${formatTime(
          lastSplit
        )} (${new Date().toISOString()})`
      );
    }
  }

  gameLoop() {
    if (this.getAbsoluteTime() - this.lastDeckAdvance >= this.deckAdvance) {
      // Advance the deck
      this.advanceDeck();
    } else if (
      this.getAbsoluteTime() - this.lastDeckAdvance >=
      this.answerReveal
    ) {
      // Reveal the answer
      this.answerText.alpha = 1;
    }

    if (
      this.getGameTime() - this.lastPedalTime >= this.doneDuration &&
      this.runnerPositions[0] > 0
    ) {
      this.finishRep();
      this.reset();
      return;
    }

    if (this.pause === 0) {
      for (let i = 0; i < this.runners.length; i++) {
        const speed = this.runnerSpeeds[i];
        if (speed == null) continue;
        const rpm = mpsToRpm(speed);
        this.runnerRevolutions[i] +=
          (rpm * this.app.ticker.deltaMS) / 1000 / 60;

        const distance = speed * this.getGameTime();
        const animation = rpm > 45 ? "sprint" : "jog";
        const frames = this.runnerSpriteSheet.animations[animation];
        const frame = Math.floor(
          (this.runnerRevolutions[i] % 1) * frames.length
        );
        this.runners[i].texture = frames[frame];
        this.runnerPositions[i] = distance;
      }
    }

    this.distanceText.text = `${Math.floor(
      this.runnerPositions[0]
    ).toLocaleString()}m`;
    this.timeText.text = formatTime(this.getGameTime());
    this.updateCam();
    const distance =
      (-this.camOffset * this.app.screen.width) / this.screenWidthInMeters;
    this.debugContainer.x = Math.round(
      (-(this.camOffset % 100) * this.app.screen.width) /
        this.screenWidthInMeters
    );
    for (let i = 0; i < this.lanes.length; i++) {
      this.lanes[i].tilePosition.x = distance + this.laneTileOffset * i;
    }
    this.middleTrees.tilePosition.x = distance * 0.3;
    this.background.tilePosition.x = distance * 0.1;
    for (let i = 0; i < this.runners.length; i++) {
      this.updateRunnerPosition(i);
    }
    // const revolutions = ((this.app.ticker.lastTime / 1000) * this.rpm) / 60;
    // const distance = revolutions * 2 * Math.PI * 16;
    // this.distanceText.text = `${Math.floor(distance / 10).toLocaleString()}m`;
    // this.timeText.text = formatTime(this.app.ticker.lastTime / 1000 + 595);
    // const animation = this.rpm > 45 ? "sprint" : "jog";
    // for (const runner of this.runners) {
    //   const frames = this.runnerSpriteSheet.animations[animation];
    //   const frame = Math.floor((revolutions % 1) * frames.length);
    //   runner.texture = frames[frame];
    // }
    // for (const track of this.lanes) {
    //   track.tilePosition.x = -distance;
    // }
    // this.middleTrees.tilePosition.x = -distance * 0.7;
    // this.background.tilePosition.x = -distance * 0.2;
  }
}
