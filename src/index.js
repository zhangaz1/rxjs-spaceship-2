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
    drawTriangle(enemy.x, enemy.y, 20, '#00ff00', 'down');
  });
};
const renderScene = actors => {
  paintStars(actors.stars);
  paintSpaceShip(actors.spaceship.x, actors.spaceship.y);
  paintEnemies(actors.enemies);
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

const ENEMY_FREQ = 1500;
const Enemies = rx.Observable.interval(ENEMY_FREQ)
  .scan(enemyArray => {
    const enemy = {
      x: parseInt(Math.random() * canvas.width, 10),
      y: -30,
    };
    enemyArray.push(enemy);
    return enemyArray;
  }, []);

const Game = rx.Observable.combineLatest(
  StarStream,
  SpaceShip,
  Enemies,
  (stars, spaceship, enemies) => ({
    stars, spaceship, enemies,
  })
);

Game.subscribe(renderScene);
