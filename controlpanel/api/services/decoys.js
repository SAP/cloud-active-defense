const Decoy = require('../models/Decoy-data');
const { isUUID, isJSON } = require('../util/index');
const { DataTypes } = require('sequelize')
const fs = require('fs');
const path = require('path');
const decoy = require('./decoy');

const UPLOADS_DIR = path.resolve('uploads/decoys/');
const DOWNLOADS_DIR = path.resolve('downloads/decoys/');

module.exports = {
    /**
    *   Return list of decoys from Database
    * @param {DataTypes.UUID} pa_id protected app id
    * @returns {{type: 'success' | 'error' | 'warning', code: number, data: Model, message: string}}
    */
    getDecoysList: async (pa_id) => {
        try {
            if (!isUUID(pa_id)) return { type: 'error', code: 400, message: 'Invalid pa_id supplied' };
            const decoys = await Decoy.findAll({ where: { pa_id } });
            if (!decoys.length) return { type: 'success', code: 404, message: 'No decoys found for this app' };
            return { type: 'success', code: 200, data: decoys, message: 'Successful operation' };
        } catch(e) {
            throw e;
        }
    },
    /**
     * Upload decoys from file
     * @param {DataTypes.UUID} pa_id protected app id
     * @param {string} decoysfilePath path to the file with decoys
     * @returns {{type: 'success' | 'error' | 'warning', code: number, action?: string message: string, data?: []}}
     */
    uploadDecoys: async (pa_id, decoysfilePath) => {
        try {
            const resolvedPath = fs.realpathSync(path.resolve(decoysfilePath));          
            if (!resolvedPath.startsWith(UPLOADS_DIR + path.sep)) {
                return { type: 'error', code: 400, message: 'Invalid file path' };
            }

            const decoysString = fs.readFileSync(resolvedPath, 'utf8');
            fs.unlinkSync(resolvedPath);
            if (!isJSON(decoysString)) return { type: 'error', code: 422, message: 'Decoys file is not a valid JSON' };
            const decoys = JSON.parse(decoysString);
            if(Array.isArray(decoys)) {
                const errorFile = [];
                for (const decoyData of decoys) {
                    const validationResult = await decoy.createDecoy({ pa_id, decoy: decoyData });
                    if (validationResult.type === 'error' && Array.isArray(validationResult.data)) errorFile.push({ ...decoyData, error: validationResult.data });
                }
                if (errorFile.length) {
                    const errorFilePath = `error_${Date.now()}.json`;
                    fs.writeFileSync(path.join(DOWNLOADS_DIR, errorFilePath), JSON.stringify(errorFile, null, 2));
                    setTimeout(() => {
                        fs.unlinkSync(path.join(DOWNLOADS_DIR, errorFilePath));
                    }, 60000);
                    return { type: 'error', action: 'download', code: 422, message: 'Some decoys were not created due to errors', data: errorFilePath };
                }
            } else {
                const validationResult = await decoy.createDecoy({ pa_id, decoy: decoys });
                if (validationResult.type === 'error') {
                    const errorFilePath = `error_${Date.now()}.json`;
                    fs.writeFileSync(path.join(DOWNLOADS_DIR, errorFilePath), JSON.stringify({ ...decoys, error: validationResult.data }, null, 2));
                    setTimeout(() => {
                        fs.unlinkSync(path.join(DOWNLOADS_DIR, errorFilePath));
                    }, 60000);
                    return { type: 'error', action: 'download', code: 422, message: 'The decoy was not created due to errors', data: errorFilePath };
                }
            }
            return { type: 'success', code: 200, message: 'Decoys uploaded successfully' };

        } catch(e) {
            try {
                const safePath = fs.realpathSync(path.resolve(decoysfilePath));
                if (safePath.startsWith(UPLOADS_DIR + path.sep)) {
                    fs.unlinkSync(safePath);
                }
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
            throw e;
        }
    },
    /**
     * Download uploaded decoys error file
     * @param {string} filename 
     * @returns {{type: 'success' | 'error', code: number, message: string, data?: string}}
     */
    downloadErrorFile: async (filename) => {
        try {
            const resolvedPath = path.resolve(DOWNLOADS_DIR, filename);
            if (!resolvedPath.startsWith(DOWNLOADS_DIR)) return { type: 'error', code: 400, message: 'Invalid filename' };
            if (!fs.existsSync(resolvedPath)) return { type: 'error', code: 404, message: 'File not found' };
            return { type: 'success', code: 200, message: 'File is ready for download', data: resolvedPath };
        } catch (e) {
            throw e;
        }
    }
}