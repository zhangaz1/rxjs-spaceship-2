/* eslint-env browser */
import rx from 'rx';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
const element = document.getElementById('app');
element.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1) + min);
const collision = (target1, target2) =>
  (target1.x > target2.x - 20 && target1.x < target2.x + 20) &&
  (target1.y > target2.y - 20 && target1.y < target2.y + 20);

const SPEED = 40;
const STAR_NUMBER = 250;
const paintStars = stars => {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  stars.forEach(star => {
    ctx.fillRect(star.x, star.y, star.size, star.size);
  });
};
const drawTriangle = (x, y, width, color, direction) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - width, y);
  ctx.lineTo(x, direction === 'up' ? y - width : y + width);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x - width, y);
  ctx.fill();
};
const paintSpaceShip = (x, y) => {
  drawTriangle(x, y, 20, '#ff0000', 'up');
};
const paintEnemies = enemies => {
  enemies.forEach(enemy => {
    enemy.y += 5;
    enemy.x += getRandomInt(-15, 15);
    if (!enemy.isDead) {
      drawTriangle(enemy.x, enemy.y, 20, '#00ff00', 'down');
    }
    enemy.shots.forEach(shot => {
      shot.y += SHOOTING_SPEED;
      drawTriangle(shot.x, shot.y, 5, '#00ffff', 'down');
    });
  });
};
const SHOOTING_SPEED = 15;
const SCORE_INCREASE = 10;
const paintHeroShots = (heroShots, enemies) => {
  heroShots.forEach(shot => {
    enemies.forEach(enemy => {
      if (!enemy.isDead && collision(shot, enemy)) {
        ScoreSubject.onNext(SCORE_INCREASE);
        enemy.isDead = true;
        shot.x = shot.y = -100;
      }
    });
    shot.y -= SHOOTING_SPEED;
    drawTriangle(shot.x, shot.y, 5, '#ffff00', 'up');
  });
};
const paintScore = score => {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`Score: ${score}`, 40, 43);
};
const ScoreSubject = new rx.BehaviorSubject(0);
const score = ScoreSubject.scan((prev, cur) => prev + cur, 0);

const renderScene = actors => {
  paintStars(actors.stars);
  paintSpaceShip(actors.spaceship.x, actors.spaceship.y);
  paintEnemies(actors.enemies);
  paintHeroShots(actors.heroShots, actors.enemies);
  paintScore(actors.score);
};

const StarStream = rx.Observable.range(1, STAR_NUMBER)
  .map(() => ({
    x: parseInt(Math.random() * canvas.width, 10),
    y: parseInt(Math.random() * canvas.height, 10),
    size: (Math.random() * 3) + 1,
  }))
  .toArray()
  .flatMap(starArray =>
    rx.Observable.interval(SPEED)
      .map(() => {
        starArray.forEach(star => {
          if (star.y >= canvas.height) {
            star.y = 0;
          }
          star.y += star.size;
        });
        return starArray;
      })
  );

const HERO_Y = canvas.height - 30;
const mouseMove = rx.Observable.fromEvent(canvas, 'mousemove');
const SpaceShip = mouseMove
  .map(event => ({
    x: event.clientX,
    y: HERO_Y,
  }))
  .startWith({
    x: canvas.width / 2,
    y: HERO_Y,
  });

const isVisible = obj =>
  obj.x > -40 && obj.x < canvas.width + 40 &&
  obj.y > -40 && obj.y < canvas.height + 40;
const ENEMY_FREQ = 1500;
const ENEMY_SHOOTING_FREQ = 750;
const Enemies = rx.Observable.interval(ENEMY_FREQ)
  .scan(enemyArray => {
    const enemy = {
      x: parseInt(Math.random() * canvas.width, 10),
      y: -30,
      shots: [],
    };
    rx.Observable.interval(ENEMY_SHOOTING_FREQ).subscribe(() => {
      if (!enemy.isDead) {
        enemy.shots.push({ x: enemy.x, y: enemy.y });
      }
      enemy.shots = enemy.shots.filter(isVisible);
    });
    enemyArray.push(enemy);
    return enemyArray
      .filter(isVisible)
      .filter(en => !(en.isDead && en.shots.length === 0));
  }, []);

const playerFiring = rx.Observable.merge(
  rx.Observable.fromEvent(canvas, 'click'),
  rx.Observable.fromEvent(document, 'keydown')
    .filter(evt => evt.keyCode === 32),
)
.startWith({})
.sample(200)
.timestamp();

const HeroShots = rx.Observable.combineLatest(
  playerFiring,
  SpaceShip,
  (shotEvents, spaceship) => ({
    x: spaceship.x,
    timestamp: shotEvents.timestamp,
  }),
)
.distinctUntilChanged(shot => shot.timestamp)
.scan((shotArray, shot) => {
  shotArray.push({ x: shot.x, y: HERO_Y });
  return shotArray;
}, []);
const gameOver = (ship, enemies) => enemies.some(enemy =>
  collision(ship, enemy) || enemy.shots.some(shot => collision(ship, shot))
);
const Game = rx.Observable.combineLatest(
  StarStream,
  SpaceShip,
  Enemies,
  HeroShots,
  score,
  (stars, spaceship, enemies, heroShots, score) => ({
    stars, spaceship, enemies, heroShots, score,
  })
)
.sample(SPEED)
.takeWhile(actors => !gameOver(actors.spaceship, actors.enemies));

Game.subscribe(renderScene);
