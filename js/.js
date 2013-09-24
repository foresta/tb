
(function() {

  $(function() {

    /*
      キーイベントはゲームフレームとは独立して動作する。
      そのため１フレーム中にキーが押されて離れて押されて・・・ということが
      理論上起こる。
      そこでInputクラスはキー情報をフレーム単位でサンプリングする。

      そのフレームでキーが押されたのか押しっぱなのかを区別する情報を保持する。
      例えばアイテムを使おうとしたときにnフレーム連続で使われてしまうような
      事態を防ぐとき役に立つ。
      ゲームレベルで実装することも可能ですが、より低レベルで実装できるならば
      それにこしたことはない。
    */
    var Input = function() {
      var i;

      // リアルタイムなキー情報
      this.analogKeys = [];

      /*
        フレーム単位でサンプリングされたキー情報
        0 : キーが離れっぱ
        1 : キーが押しっぱ
        2 : キーが離れた
        3 : キーが押された
      */
      this.digitalKeys = [];

      for(i = 0; i < 128; ++i) {
        this.analogKeys[i] = false;
        this.digitalKeys[i] = 0;
      }

      var analogKeys = this.analogKeys;
      $(document).on('keydown', function(e) {
        analogKeys[e.keyCode] = true;
      });
      $(document).on('keyup', function(e) {
        analogKeys[e.keyCode] = false;
      });
    };
    /*
      キー情報をサンプリングする
      フレームの先頭で１回だけ呼び出す
    */
    Input.prototype.update = function() {
      var i;
      for(i = 0; i < 128; ++i)
        this.digitalKeys[i] = this.analogKeys[i] ?
          (this.digitalKeys[i] % 2 + 2) % 3 + 1 : this.digitalKeys[i] % 2 * 2;
    };
    Input.prototype.get = function(keyCode) {
      return this.digitalKeys[keyCode];
    };
    // Input.prototype.getJSON = function() {
    //   return JSON.stringify(this.digitalKeys);
    // };
    // Input.prototype.setJSON = function(str) {
    //   delete this.digitalKeys;
    //   this.digitalKeys = JSON.parse(str);
    // };

    var Key = {
      z: 0,
      x: 1,
      left: 2,
      up: 3,
      right: 4,
      down: 5
    };

    /*
      コンピュータの操作やキーコンフィグを考慮するとキー情報を直接扱いたくない。
      例えばzキーが押された時にアイテムを使うとすると、
      'コンピュータがzキーを押す処理'ではなく、
      'コンピュータがアイテムを使う処理'を書きたい。
      そこでActionクラスはアクション情報でキー情報を隠ぺいする。
    */
    var Action = function(input, actionToKeyCode) {
      this.input = input;
      this.actionToKeyCode = actionToKeyCode;
    };
    Action.prototype.get = function(action) {
      return this.input.get(this.actionToKeyCode[action]);
    };
    Action.prototype.isDown = function(action) {
      return this.get(action) % 2 === 1;
    };
    Action.prototype.isDownNow = function(action) {
      return this.get(action) === 3;
    };
    Action.prototype.isUpNow = function(action) {
      return this.get(action) === 2;
    };

    var Player = function(game) {
      this.game = game;
    };

    var Human = function(game, action) {
      Player.call(this, game);

      this.action = action;
    };
    Human.prototype = new Player();
    Human.prototype.play = function() {
      this.game.play(this.action);
    };

    var HumanViaNet = function(game) {
      Player.call(this, game);
    };
    HumanViaNet.prototype = new Player();
    HumanViaNet.prototype.play = function() {
    };

    var Game = function() {
      this.games = [];
    };
    Game.prototype.addGame = function(game) {
      this.games.push(game);
    };

    var TetrisBreakout = function() {
      Game.call(this);

      this.tetris = new Tetris();
      this.breakout = new Breakout();
    };
    TetrisBreakout.prototype = new Game();
    TetrisBreakout.prototype.play = function(action) {
      this.tetris.play(action);
      this.breakout.play(action);
    };
    TetrisBreakout.prototype.draw = function(c) {
      this.tetris.draw(c);
      this.breakout.draw(c);
    };

    var GameInGame = function() {
    };

    var Tetris = function() {
    };
    Tetris.prototype = new GameInGame();
    Tetris.prototype.play = function(action) {
    };
    Tetris.prototype.draw = function(c) {
    };

    var Breakout = function() {
      this.x = this.y = 256;
    };
    Breakout.prototype = new GameInGame();
    Breakout.prototype.play = function(action) {
      if(action.isDown(Key.left))
        this.x -= 5;
      if(action.isDown(Key.right))
        this.x += 5;
      if(action.isDown(Key.up))
        this.y -= 5;
      if(action.isDown(Key.down))
        this.y += 5;
    };
    Breakout.prototype.draw = function(c) {
      c.clearRect(0, 0, 512, 512);
      c.fillRect(this.x, this.y, 32, 32);
    };

    var God = function() {
      var i, j;

      var c = $('#canvas')[0];
      if(c && c.getContext)
        this.c = c.getContext('2d');

      this.games = [new TetrisBreakout()];
      for(i = 0; i < this.games.length; ++i) {
        for(j = 0; j < this.games.length; ++j) {
          if(i !== j)
            this.games[i].addGame(this.games[j]);
        }
      }

      this.input = new Input();

      var actionToKeyCode = [];
      actionToKeyCode[Key.z] = 90;
      actionToKeyCode[Key.x] = 88;
      actionToKeyCode[Key.left] = 37;
      actionToKeyCode[Key.up] = 38;
      actionToKeyCode[Key.right] = 39;
      actionToKeyCode[Key.down] = 40;
      this.players = [new Human(this.games[0],
                                new Action(this.input, actionToKeyCode))];

      this.play();
    };
    God.prototype.play = function() {
      var i;

      this.input.update();

      for(i = 0; i < this.players.length; ++i)
        this.players[i].play();

      for(i = 0; i < this.games.length; ++i)
        this.games[i].draw(this.c);

      var this_ = this;
      setTimeout(function() {
        this_.play();
      }, 20);
    };

    new God();

  });

})();
