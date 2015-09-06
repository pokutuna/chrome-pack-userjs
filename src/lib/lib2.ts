module Lib2 {
    export class Lib2Sample {
        message: string;

        constructor(message: string) {
            this.message = message;
            console.log('lib2:' + this.message);
        }
    }
}

export = Lib2;
