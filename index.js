const Ftp   = require('ftp');
const merge = require('lodash/merge');
const path  = require('path');
const url   = require('url');

class FtpHttpAdapter {
  constructor(options) {
    this.options = processOptions(options);
    this.ftpClient = new Ftp();

    this.ftpConnect = new Promise((resolve) => {
      this.ftpClient.on('ready', resolve);
    });

    if(this.options.debug) {
      this.ftpClient.on('greeting', console.log); // eslint-disable-line no-console
      this.ftpClient.on('close', console.log); // eslint-disable-line no-console
      this.ftpClient.on('end', console.log); // eslint-disable-line no-console
      this.ftpClient.on('error', console.error); // eslint-disable-line no-console
    }

    this.ftpClient.connect(this.options.ftp);
  }

  createFile(filename, data) {
    const buffer = Buffer.from(data);
    const filePath = path.join(this.options.ftp.path, filename);

    return this.ftpConnect.then(() => {
      return new Promise((resolve, reject) => {
        this.ftpClient.put(buffer, filePath, function(err) {
          if(err) return reject(err);
          resolve();
        });
      });
    });
  }

  getFileData(filename) {
    const filePath = path.join(this.options.ftp.path, filename);

    return this.ftpConnect.then(() => {
      return new Promise((resolve, reject) => {
        this.ftpClient.get(filePath, function(err, stream) {
          if(err) return reject(err);
          resolve(streamToBuffer(stream));
        });
      });
    });
  }

  deleteFile(filename) {
    return this.ftpConnect.then(() => {
      return new Promise((resolve, reject) => {
        this.ftpClient.delete(path.join(this.options.ftp.path, filename), function(err) {
          if(err) return reject(err);
          resolve();
        });
      });
    });
  }


  getFileLocation(config, filename) {
    filename = encodeURIComponent(filename);
    const {host, path, port} = this.options.http
    const baseUrl = url.resolve((port == 80 ? host : `${host}:${port}`), path);
    return `${baseUrl}/${filename}`;
  }
}

module.exports = FtpHttpAdapter;
module.exports.default = FtpHttpAdapter;

function processOptions(options) {
  const defaults = {
    ftp: {
      path: '/'
    },

    http: {
      port: 80,
      path: '/'
    }
  };

  [
    'ftp.host',
    'http.host',
  ].forEach(function(key) {
    if (!key.split('.').reduce((o, k) => o[k], options)) {
      throw `FtpHttpAdapter requires option '${key}'`;
    }
  });

  return merge({}, defaults, options);
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    let buffer = new Buffer("");
    stream.on('data', function(data) {
      buffer = Buffer.concat([buffer, data]);
    });
    stream.on('end', function() {
      resolve(buffer);
    });
    stream.on('error', reject);
  });
}
