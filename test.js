const Client = require('./index');

const test = async () => {

  const client = await Client('com.google.chrome.example.echo').connect();

  if (client.isConnected) {
    client.streamOut.on('data', msg => { console.log('event streamOut data', msg.toString()) });
    client.streamErr.on('data', msg => { console.log('event streamErr data', msg.toString()) });
    client.hostProcess.on('exit', (code, signal) => { console.log('event exit', code, signal) });
    client.hostProcess.on('close', (code, signal) => { console.log('event close', code, signal) });
    client.hostProcess.on('disconnect', () => { console.log('event disconnect') });

    client.send('cool 1');

    setTimeout(() => {
      client.close();
    }, 10000)
  }
};

test();
