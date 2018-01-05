#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

// 文档目录, 可自定义
const BOOK_DIR = 'books';
// 分目录README
const README = 'README';
//目录索引
const SUMMARY = 'SUMMARY.md';
//执行次数
var time = 1;

(function() {
	var modules = {}
	var args = process.argv.slice(1);
	var scriptDir = args[0].substring(0, args[0].lastIndexOf('/') + 1);//脚本所在目录
	var booksDir = scriptDir + BOOK_DIR;
	var summaryDir = scriptDir + SUMMARY;
	var tempSumDir = scriptDir + 'temp';//临时目录
	var tempSummary = tempSumDir + '/' + SUMMARY;//临时目录下的summary

	/**
	 * 加载目录结构以JSON形式存储
	 * @param  {[string]} bookPath [markdown文档目录]
	 * @return {[void]}          [description]
	 */
	var loadSummary = function(bookPath) {
		if(!bookPath || !fs.existsSync(bookPath)) {
			console.log('目录: ' + bookPath + '不存在')
			return;
		}

		let files = fs.readdirSync(bookPath);
		files.forEach(function(element) {
			let dir = bookPath + '/' + element;
			if(fs.statSync(dir).isDirectory())
				modules[element] = loopLoad(dir);
		}, this);

		console.log('加载数据完成: ' + JSON.stringify(modules) + '\n');
	}

	var loopLoad = function(bookPath) {
		let dirName = path.posix.basename(bookPath);//目录名
		let files = fs.readdirSync(bookPath);

		let tempModule = {};

		files.forEach(function(fileName) {
			//当前文件地址
			let fileDir = path.join(bookPath, fileName);

			let stat = fs.statSync(fileDir);
			let isFile = stat.isFile();
			let isDir = stat.isDirectory();

			if(isFile && fileName.charAt(0) != '.') {
				fileName = fileName.substring(0, fileName.split('.')[0].length);//取文件名, 去掉后缀
				tempModule[fileName] = fileDir;
			}

			if(isDir) {
				tempModule[fileName] = loopLoad(fileDir);
			}
		}, this);

		console.log('当前目录' + bookPath + '\n');
		console.log(dirName + '当前数据: ' + JSON.stringify(tempModule) + '\n');

		return tempModule;
	}

	/**
	 * 写入SUMMARY.md
	 * @return {[type]} [description]
	 */
	var createSummary = function() {
		if(!fs.existsSync(tempSumDir)) {
			fs.mkdirSync(tempSumDir);
		}
		if(!fs.existsSync(tempSummary)) {
			fs.writeFileSync(tempSummary, '');
		}

		let list = Object.keys(modules);
		list.forEach(function(element) {
			loopCreate(modules, element, 0);
		}, this);
	}

	var loopCreate = function(module, key, spaceCount) {
		let element = module[key];//文件路径或者是Object(代表目录)
		// let curFile = dirPath + '/' + key;
		if(element instanceof Object) {
			let moduleReadme = element[README];
			if(!fs.existsSync(moduleReadme)) {
				console.log('当前目录' + key + '不存在README.md' + '文件, 请添加');
				return ;
			}

			let moduleName = moduleReadme.substring(scriptDir.length, moduleReadme.length)
			appendFilePath(tempSummary, key, moduleName, spaceCount);

			let list = Object.keys(element);
			list.forEach(function(nextElement) {
				loopCreate(element, nextElement, spaceCount + 1);
			}, this);

		} else if(typeof element == "string") {
			if(key == README) {
				return;
			}
			let aritcleName = element;
			let articlePath = aritcleName.substring(scriptDir.length, aritcleName.length);
			appendFilePath(tempSummary, key, articlePath, spaceCount);
		}
	}

	/**
	 * 写入SUMMARY.md
	 * @param  {[string]} file       被写入的文件
	 * @param  {[string]} name       名称
	 * @param  {[string]} path       路径
	 * @param  {[int]} spaceCount 前置空格
	 * @return {[void]}            [description]
	 */
	var appendFilePath = function(file, name, path, spaceCount) {
		for(let i = 0; i < spaceCount; i ++) {
			fs.appendFileSync(file, '    ');
		}
		fs.appendFileSync(file, '* ');
		fs.appendFileSync(file, '[');
		fs.appendFileSync(file, name);
		fs.appendFileSync(file, '](');
		fs.appendFileSync(file, path);
		fs.appendFileSync(file, ')')
		fs.appendFileSync(file, '\n');
	}

	/**
	 * 将临时目录SUMMARY.md移动到原目录, 删除临时目录
	 * @return {[void]} [description]
	 */
	var finishTask = function() {
		if(fs.existsSync(tempSummary))
			fs.renameSync(tempSummary, summaryDir);
		else
			console.log('临时文件' + tempSummary + '不存在');
		if(fs.existsSync(tempSumDir))
			fs.rmdirSync(tempSumDir);
	}

	var pullScript = function() {
		console.log('执行次数: ' + time + ' 执行时间: ' + new Date() + '\n');
		time += 1;
		exec('git pull', function(err, stdout, stderr) {
			if(err)
				throw err;
			console.log(stdout);
			if(stdout.match('Already up-to-date.'))
				pullScript();
			else
				generateSummary();
		}, this);
	}

	var generateSummary = function() {
		loadSummary(booksDir);
		createSummary();
		finishTask();
	}

	var main = function() {
		// pullScript();
		generateSummary();
	}

	main();

})();
