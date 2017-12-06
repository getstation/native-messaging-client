Native Messaging Client
==========

Communicate with apps trough the Native Messaging API


Install
-------

```bash
npm install native-messaging-client --save
```


Usage examples
--------------

##### Example

```js
const demo = async () => {

  const client = await Client('com.google.chrome.example.echo').connect();

  if (client.isConnected) {
    client.streamOut.on('data', msg => { console.log('event streamOut data', msg.toString()) });
    client.streamErr.on('data', msg => { console.log('event streamErr data', msg.toString()) });
    client.hostProcess.on('exit', (code, signal) => { console.log('event exit', code, signal) });
    client.hostProcess.on('close', (code, signal) => { console.log('event close', code, signal) });
    client.hostProcess.on('disconnect', () => { console.log('event disconnect') });

    client.send('my message');

    setTimeout(() => {
      client.close();
    }, 10000)
  }
};

demo();
```


## Todo
- [ ] client singleton with multiple processes
- [ ] better buffer management for long messages
- [ ] tests

## License

[MIT](https://github.com/hugomano/native-messaging-client/blob/master/LICENSE)
