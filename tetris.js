//描画の設定
var contextWidth=600;
var contextHeight=800;
var blocksDrawStartX=15;
var blocksDrawStartY=15;
var blockSize=38;

//ゲームの設定
var rowCount=20;
var columnCount=10;
var initrow=0; //テトリミノの初期位置
var initcolumn=4; //同上
var blockArray=generateInitialBlockArray(); //左上が[row=0,column=0],-1が空きブロック、0以上はブロックあり
var subtableRowCol=4;

//定数
const STYLE_BLANK='blankblock';
const styleArray=['tetrimino1', 'tetrimino2', 'tetrimino3', 'tetrimino4', 'tetrimino5', 'tetrimino6', 'tetrimino7']
const tetriminoArray=[
	[[0,0], [0,-1], [0,1], [0,2]],
	[[0,0], [0,-1], [0,1], [-1,1]],
	[[0,0], [0,-1], [-1,-1], [0,1]],
	[[0,0], [0,-1], [-1,0], [0,1]],
	[[0,0], [-1,-1], [-1,0], [0,1]],
	[[0,0], [0,-1], [-1,0], [-1,1]],
	[[0,0], [-1,0], [0,1], [-1,1]],
];
/* [-1,-1] [-1,0] [-1,1] [-1,2]
*  [0,-1]  [0,0]  [0,1]  [0,2]
*  [1,-1]  [1,0]  [1,1]  [1,2]
*/
const STATE_WAIT=0;
const STATE_DROPPING=1; //テトリミノ落下中
const STATE_ERASING=2; //テトリミノ消去中
const STATE_GAMEOVER=3; //ゲームオーバー

const TICK_FIX=5; //落とせなくなってから固定されるまでにかかるtick数

//ゲームの状態
var gameState=STATE_WAIT;
var frame=0;
var currentTetriminoInfo=null;
var nextTetriminoInfo=null;
var holdTetriminoInfo=null;
var fixCount=TICK_FIX;
var holdUsed=false;

$(document).ready(function(){
	$('table#blocktable td:nth-child(n)').addClass(STYLE_BLANK); //初期化
	$('table#nexttable td:nth-child(n)').addClass(STYLE_BLANK); //初期化
	$('table#holdtable td:nth-child(n)').addClass(STYLE_BLANK); //初期化

	$(document).on("keydown",(function(eo){
		if(currentTetriminoInfo!=null){
			switch(eo.key){
				case "ArrowRight":
					currentTetriminoInfo.move(1);
					break;
				case "ArrowLeft":
					currentTetriminoInfo.move(-1);
					break;
				case "ArrowDown":
					currentTetriminoInfo.drop();
					break;
				case "z":
					currentTetriminoInfo.rotate(-1);
					break;
				case "c":
					currentTetriminoInfo.rotate(1);
					break;
				case "Shift":
					holdCurrentTetrimino();
					break;
				default:
					break;
			}
			currentTetriminoInfo.draw();
		}
	}));


	gameState=STATE_DROPPING;

	setInterval(function(){
		tick();
	},100) //10tick/sec
});


/**
 * ゲーム開始時のテトリミノがない空のブロック配列を生成する
 */
function generateInitialBlockArray(){
	var result=new Array(rowCount);
	for(let r=0; r<rowCount; ++r){
		result[r]=new Array(columnCount);
		for(let c=0; c<columnCount; ++c){
			result[r][c]=-1;
		}
	}
	return result;
}

/**
 * 今置かれているblockを全て描画する
 */
function drawAllBlock(){
	for(let r=0; r<rowCount; ++r){
		for(let c=0; c<columnCount; ++c){
			let style=STYLE_BLANK;
			if(blockArray[r][c]>=0){
				style=styleArray[blockArray[r][c]];
			}
			changeSingleBlockColor(r,c,style);
		}
	}
}

/**
 * 指定した位置のブロックの色(スタイル)を変更する
 * @param {*} row
 * @param {*} column
 * @param {*} style
 * @param {*} blocktable 変更するテーブルのID,defaultでblocktable
 */
function changeSingleBlockColor(row, column, style, tableid="blocktable"){
	if(row>=0 && row<rowCount && column>=0 && column<columnCount){
		var block=$('table#'+tableid+' tr:nth-child('+(row+1)+') td:nth-child('+(column+1)+')');
		block.removeAttr('class');
		block.addClass(style);
	}
}

/**
 * 指定した位置にブロックを置けるかどうかを調べる
 * @param {*} row
 * @param {*} column
 * @param {*} resultOutOfIndex 範囲外の時に返される値(default=false)
 * @return {*} true/false
 */
function canPutBlock(row, column, resultOutOfIndex=false){
	if(row<0 || row>=rowCount || column<0 || column>=columnCount){
		return resultOutOfIndex;
	}
	return blockArray[row][column]<0;
}

/**
 * 指定した位置にブロックを置く
 * @param {*} row 
 * @param {*} column 
 * @param {*} index 
 * @returns 
 */
function putBlock(row, column, index){
	if(row>=0 && row<rowCount && column>=0 && column<columnCount){
		blockArray[row][column]=index;
	}
}

/**
 *現在のテトリミノをholdする
 *
 */
function holdCurrentTetrimino(){
	if(holdUsed){return;}
	let temp=holdTetriminoInfo;
	holdTetriminoInfo=currentTetriminoInfo;
	holdTetriminoInfo.setInitPosition();
	holdTetriminoInfo.setInitRotation();
	if(temp!=null){
		currentTetriminoInfo=temp;
	}
	else{
		currentTetriminoInfo=nextTetriminoInfo;
		nextTetriminoInfo=TetriminoInfo.generateRandomTetrimino();
		nextTetriminoInfo.drawOnNextTable();
	}
	holdUsed=true;
	if(holdTetriminoInfo!=null){
		holdTetriminoInfo.drawOnHoldTable();
	}
	if(currentTetriminoInfo.isGameOver()){
		gameState=STATE_GAMEOVER;
	}
}

class TetriminoInfo{
	constructor(index, row, column){
		this.index=index;
		this.tetrimino=[];
		var temp=tetriminoArray[index];
		for(let i=0; i<temp.length; ++i){
			this.tetrimino.push([].concat(temp[i]));
		} //this.tetriminoは回転させるのでコピー
		this.row=row;
		this.column=column;
		this.style=styleArray[index];
		this.rotateSum=0;
	}

	static generateNextTetrimino(index){
		return new TetriminoInfo(index,initrow,initcolumn);
	}

	/**
	 *ランダムなテトリミノのinfoを1つ生成
	 *
	 * @static
	 * @return {*} 
	 * @memberof TetriminoInfo
	 */
	static generateRandomTetrimino(){
		return this.generateNextTetrimino(Math.floor(Math.random()*tetriminoArray.length));
	}

	/**
	 *現在位置に指定したスタイルで描画
	 *
	 * @param {*} style
	 * @memberof TetriminoInfo
	 */
	_drawWithStyle(style){
		for(let i=0; i<this.tetrimino.length; ++i){
			let block=this.tetrimino[i];
			changeSingleBlockColor(this.row+block[0], this.column+block[1], style);
		}
	}

	/**
	 *現在位置に描画する
	 *
	 * @memberof TetriminoInfo
	 */
	draw(){
		this._drawWithStyle(this.style);
	}

	/**
	 *現在位置の描画を消す
	 *
	 * @memberof TetriminoInfo
	 */
	undraw(){
		this._drawWithStyle(STYLE_BLANK);
	}

	/**
	 * 今の位置に固定する
	 * 
	 */
	putOnCurrentPosition(){
		for(let i=0; i<this.tetrimino.length; ++i){
			let block=this.tetrimino[i];
			putBlock(this.row+block[0], this.column+block[1], this.index);
		}
	}

	/**
	 *指定しただけrow,columnをずらした位置に置けるかどうか調べる
	 *
	 * @param {*} rowAdder
	 * @param {*} columnAdder
	 * @memberof TetriminoInfo
	 * @returns true/false
	 */
	_canShiftTo(rowAdder, columnAdder){
		for(let i=0; i<this.tetrimino.length; ++i){
			let block=this.tetrimino[i];
			if(!canPutBlock(this.row+rowAdder+block[0], this.column+columnAdder+block[1])){
				return false;
			}
		}
		return true;
	}

	/**
	 * 1マス下に置けるかを調べる
	 * private
	 * @returns true/false
	 */
	_canDrop(){
		return this._canShiftTo(1,0);
	}

	/**
	 *1マス下に移動させる
	 * @return {*} 移動できたらtrue/できなかったらfalse
	 * @memberof TetriminoInfo
	 */
	drop(){
		let result=false;
		this.undraw();
		if(this._canDrop()){
			this.row+=1;
			result=true;
		}
		this.draw();
		return result;
	}

	/**
	 *横に移動できるかを調べる
	 *private
	 * @param {*} columnAdder columnの変位、左なら-1,右なら+1
	 * @memberof TetriminoInfo 
	 * @returns true/false
	 */
	_canMove(columnAdder){
		return this._canShiftTo(0,columnAdder);
	}

	/**
	 *横に移動できるかをチェックして、移動可能なら移動させる
	 *
	 * @param {*} columnAdder columnの変位左なら-1,右なら+1
	 * @memberof TetriminoInfo
	 * @returns 移動できたならtrue,できなかったらfalse
	 */
	move(columnAdder){
		let result=false;
		this.undraw();
		if(this._canMove(columnAdder)){
			this.column+=columnAdder;
			result=true;
		}
		this.draw();
		return result;
	}

	/**
	 *回転できるかを調べる
	 *・右回転
	 *　[0  1][r]=[ c]
	 *　[-1 0][c] [-r]
	 *・左回転
	 *　[0 -1][r]=[-c]　
	 *　[1  0][c] [ r]
	 * @param {*} rotation 回転方向,左回転なら-1,右回転なら1
	 * @param {*} isForce trueの場合ブロックが置けない場合でも新しいテトリミノ配列を返す
	 * @memberof TetriminoInfo
	 * @returns 新しいtetrimino配列、回転できないならnull
	 */
	_canRotate(rotation, isForce=false){
		let result=[];
		for(let i=0; i<this.tetrimino.length; ++i){
			let block=this.tetrimino[i];
			let temp=[rotation*block[1], -rotation*block[0]];
			if(!canPutBlock(this.row+temp[0], this.column+temp[1]) && !isForce){
				return null;
			}
			result.push(temp);
		}
		return result;
	}

	/**
	 *回転させる
	 *
	 * @param {*} rotation 回転方向,左回転なら-1,右回転なら1
	 * @memberof TetriminoInfo
	 */
	rotate(rotation){
		this.undraw();
		let nextMino=this._canRotate(rotation);
		if(nextMino!=null){
			this.tetrimino=nextMino;
			this.rotateSum+=rotation;
			if(this.rotateSum==-4 || this.rotateSum==4){ //一回転したら回転していないのと同じ
				this.rotateSum=0;
			}
		}
		this.draw();
	}

	/**
	 * ゲームオーバー状態であるかどうか
	 *
	 * @return {*} 
	 * @memberof TetriminoInfo
	 */
	isGameOver(){
		for(let i=0; i<this.tetrimino.length; ++i){
			let block=this.tetrimino[i];
			if(!canPutBlock(this.row+block[0], this.column+block[1], true)){
				return true;
			}
		}
		return false;
	}

	/**
	 *指定したsubtableに描画
	 *
	 * @param {*} tableid
	 * @memberof TetriminoInfo
	 */
	_drawOnSubtable(tableid){
		for(let r=0; r<subtableRowCol; ++r){
			for(let c=0; c<subtableRowCol; ++c){
				changeSingleBlockColor(r,c,STYLE_BLANK,tableid);
			}
		}
		for(let i=0; i<this.tetrimino.length; ++i){
			let block=this.tetrimino[i];
			changeSingleBlockColor(block[0]+2, block[1]+1, this.style, tableid);
		}
	}

	drawOnNextTable(){
		this._drawOnSubtable("nexttable");
	}

	drawOnHoldTable(){
		this._drawOnSubtable("holdtable");
	}

	/**
	 *初期位置に戻す
	 *
	 * @memberof TetriminoInfo
	 */
	setInitPosition(){
		this.row=initrow;
		this.column=initcolumn;
	}

	/**
	 *初期の回転に戻す
	 *
	 * @memberof TetriminoInfo
	 */
	setInitRotation(){
		while(this.rotateSum!=0){
			let num=this.rotateSum>0? -1:1;
			this.tetrimino=this._canRotate(num, true);
			this.rotateSum+=num;
		}
	}
}

/**
 * 毎フレーム呼び出されるゲーム処理
 *
 */
function tick(){
	frame+=1;
	switch(gameState){
		case STATE_WAIT:
			tickWaiting();
			break;
		case STATE_DROPPING:
			tickDropping();
			break;
		case STATE_ERASING:
			tickErasing();
			break;
		case STATE_GAMEOVER:
			tickGameOver();
			break;
		default:
			break;
	}
}

/**
 * gameStateがSTATE_WAITのときの処理
 * 次のテトリミノを設定する
 */
function tickWaiting(){
	if(currentTetriminoInfo==null){
		if(nextTetriminoInfo==null){
			currentTetriminoInfo=TetriminoInfo.generateRandomTetrimino();
		}
		else{
			currentTetriminoInfo=nextTetriminoInfo;
		}
		nextTetriminoInfo=TetriminoInfo.generateRandomTetrimino();
	}
	if(currentTetriminoInfo.isGameOver()){
		gameState=STATE_GAMEOVER;
		return;
	}
	currentTetriminoInfo.draw();
	if(nextTetriminoInfo!=null){
		nextTetriminoInfo.drawOnNextTable();
	}
	gameState=STATE_DROPPING;
}

/**
 * gameStateがSTATE_DROPPINGの時の処理
 * テトリミノを1マス落とし、落とせないなら位置を確定させる
 */
function tickDropping(){
	if(currentTetriminoInfo==null){
		gameState=STATE_WAIT;
	}
	else{
		drawAllBlock();
		let dropped=currentTetriminoInfo.drop()
		if(dropped){ //落下できた場合
			fixCount=TICK_FIX;
		}
		else{
			fixCount-=1;
			if(fixCount<=0){
				currentTetriminoInfo.draw();
				currentTetriminoInfo.putOnCurrentPosition();
				currentTetriminoInfo=null;
				holdUsed=false;
				gameState=STATE_ERASING;
			}
		}
	}
}

/**
 * gameStateがSTATE_ERASINGの時の処理
 * 
 */
function tickErasing(){
	eraseFilledLine();
	drawAllBlock();
	gameState=STATE_WAIT;
}

/**
 * ブロックを消せるlineを消去
 */
function eraseFilledLine(){
	blockArray=blockArray.filter(function(rowArray){
		for(let c=0; c<columnCount; ++c){
			if(rowArray[c]<0){
				return true;
			}
		}
		return false;
	});
	while(blockArray.length<rowCount){
		blockArray.unshift(generateNewRowLine());
	}
}

/**
 * 新しい行の配列を作成
 */
function generateNewRowLine(){
	result=[];
	for(let c=0; c<columnCount; ++c){
		result.push(-1);
	}
	return result;
}

function tickGameOver(){
	console.log("GAME OVER");
}