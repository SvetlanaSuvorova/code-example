/* A simple standalone XML-RPC server written in C. */

#include <stdlib.h>
#include <stdio.h>

#ifdef WIN32
#  include <windows.h>
#else
#  include <unistd.h>
#endif

#include <xmlrpc-c/base.h>
#include <xmlrpc-c/server.h>
#include <xmlrpc-c/server_abyss.h>

#include <xmlrpc-c/config.h>  /* information about this build environment */


#define BUFFER_SIZE  511*1024*2

/*
* Variable to init/stop scanning
*/
int ScanActive;

/*
* Function sets init/stop scanning variable 
*/
void setScanActive(int scanActiveP) {
	ScanActive = scanActiveP;
}

/*
* Function execute scanning
*/
HRESULT executeScanOperation (int framesCountP, int expositionTimeFrameP, int overlapZoneP, char * fileNameP) {
	HRESULT result;
	int i;
	char filePrefix[4];
	char * fileNameCurrent;
	unsigned int * buf = malloc(BUFFER_SIZE * sizeof(unsigned int));

	fileNameCurrent = malloc(strlen(fileNameP) + 5); 
	result = S_OK;
	i = 0;

	// Basic scanning cycle
	while ((i < framesCountP) && (result == S_OK) && (ScanActive == 1)) {

		#ifdef DEBUG
		    if (i == 0) {
		        result = getBufferFromDevice(buf, expositionTimeFrameP, overlapZoneP-1);
		    }
		    else  {
		        result = getBufferFromDevice(buf, expositionTimeFrameP, overlapZoneP);
		    }
		#else
	        if (i == 0) {
			    result = getBufferFromDevice(buf, expositionTimeFrameP, overlapZoneP-1);
			}
			else {
			    result = getBufferFromDevice(buf, expositionTimeFrameP, overlapZoneP);//110417
			}
		#endif		
		

		// Create file name
		itoa(i, filePrefix, 10);
		strcpy(fileNameCurrent, fileNameP);
		strcat(fileNameCurrent, "_");
		strcat(fileNameCurrent, filePrefix);
		
		// Save scanning data frame in the file
		result = saveBufferToFile(buf, fileNameCurrent);	
		i = i + 1;
	}
	if (ScanActive == 0) {
		framesCountP = i;
	}
	
	free(buf);
	free(fileNameCurrent);

	return result;
}

/*
* Function is save scanning data received from device in the file
*/
HRESULT saveBufferToFile(int * bufP,  char * fileNameP) {
	HRESULT result;
	FILE *pFile;
	result = S_OK;

	// File write
	pFile = fopen(fileNameP, "wb");
	if (pFile != NULL) {
		fwrite (bufP , sizeof(unsigned int), BUFFER_SIZE, pFile);
		fclose (pFile);
	}
	else {
		fprintf(stderr, "Error opening file!\n");
		result = S_FALSE;
	}

	return result;
}

/*
* Get frame data from device
*/
HRESULT getBufferFromDevice(int * bufP, int expositionTimeFrameP, int overlapZoneP) {
	HRESULT result;
	int i,sum,nn;
	int count_clr;

	result = S_OK;
	i = 0;
	if (overlapZoneP&1) {
	    for (count_clr = 0; count_clr < 3; count_clr = count_clr + 1) {
            if (f2(1, 0, bufP) == -1) {
                fprintf(stderr, "Error by sleep to matrix cleanup!\n");
                result = 0x0012;
                return result;
            }
	    }
        Sleep((expositionTimeFrameP - 1) * 1000 + 10);
        if (f2(1, 0, bufP) == -1) {
           fprintf(stderr, "Error by sleep to matrix cleanup!\n");
           result = 0x0012;
           return result;
        }
	} else {
	    count_clr = 1;
 	    if (f3(450, 750, overlapZoneP, 2) == -1) {//2 080417 if (f3(300, 700, overlapZoneP, 2) == -1)
		    fprintf(stderr, "Error in function f3()!\n");
  		    result = 0x0011;
	    }
	    for (; count_clr < 2; count_clr = count_clr + 1) {
            if (f2(0, 0, bufP) == -1) {
			    fprintf(stderr, "Error by sleep to matrix cleanup!\n");
                result = 0x0012;
			    return result;
            }
	    }
	    sum = 1;

    	Sleep((expositionTimeFrameP - 1) * 1000 + 10);
	    sum = f2(0, 0, bufP);
 	    if (sum == -1) {
		    fprintf(stderr, "Error get data buffer!\n");
            result = 0x0013;
		    return result;
 	    }
	}

//fprintf(stderr, "Succes get data buffer!\n");
	return result;
}

/*
* Execute reverse device back to inital state
*/
HRESULT executeReverse(int framesCountP, int overlapZoneP) {
	HRESULT result;
	result = S_OK;

	fprintf(stderr, "Count reverce in execute reverce %d ", framesCountP);
	f_clr_step();//130417 

	return result;
}

/*
* Get frame data buffer as array in debug mode
*/
HRESULT getBufferFromDevice_Debug(int * bufP, int framesCountP, int expositionTimeFrameP, int overlapZone) {
	HRESULT result;
	int i,j;
	result = S_OK;
	j = 0;
	for (i = 0; i < BUFFER_SIZE; i++) {
		if (j == 510) bufP[i] = 0;
		if (j == 511) j = 0;
	//	if (i %511 == 0) j++;
        bufP[i] = j;
		j++;
	}

	return result;
}

/*
* Scanning method
*/
static xmlrpc_value *
RMU1ScanInit_set(xmlrpc_env *   const envP,
           xmlrpc_value * const paramArrayP,
           void *         const serverInfo,
           void *         const channelInfo) {

    xmlrpc_int32 framesCountP;  // количество кадров
    xmlrpc_int32 volltageSourceP; // напряжение
    xmlrpc_double currentSourceP; // сила тока
    xmlrpc_int32 expositionTimeFrameP; // время экспозиции кадра
    xmlrpc_int32 targetTimeFrameP; // время позиционирования
	xmlrpc_int32 overlapZoneP; // зона перекрытия кадра
	xmlrpc_int32 reverseP;

	const char * dataFileNameP; // название временных файлов
	HRESULT result;

	result = S_OK;

   // Parse our argument array 
    xmlrpc_decompose_value(envP, paramArrayP, "(iidiiiis)", 
			&framesCountP,  
			&volltageSourceP, 
			&currentSourceP, 
			&expositionTimeFrameP,
			&targetTimeFrameP, 
			&overlapZoneP,
			&reverseP,
			&dataFileNameP 
	);
    if (envP->fault_occurred)
        return NULL;
	
	// Scanning
		#ifdef DEBUG
		#else
			setScanActive(1);
			result = executeScanOperation(framesCountP, expositionTimeFrameP, overlapZoneP, dataFileNameP);
			setScanActive(0);
		#endif

	free((void *)dataFileNameP);
	
	// Reverse
	if (reverseP == 1) 
	{		
		#ifdef DEBUG
		#else
			result = executeReverse(framesCountP, overlapZoneP/2);
		#endif
	}
// fprintf(stderr, "Result %d ", result);
    // Return result 
    return xmlrpc_build_value(envP, "i", (xmlrpc_int32)result);
}

/*
* Cancel scanning method
*/
static xmlrpc_value *
RMU1ScanStop_set(xmlrpc_env *   const envP,
           xmlrpc_value * const paramArrayP,
           void *         const serverInfo,
           void *         const channelInfo) {

	HRESULT result;
	result = S_OK;
    if (envP->fault_occurred)
        return NULL;
	
	// Scanning stop
	setScanActive(0);

//	fprintf(stderr, "Scan stop result %d ", result);
    // Return result
     return xmlrpc_build_value(envP, "i", (xmlrpc_int32)result);
}

/*
* Check connection to RMU1 device method
*/
static xmlrpc_value *
RMU1Connection_set(xmlrpc_env *   const envP,
           xmlrpc_value * const paramArrayP,
           void *         const serverInfo,
           void *         const channelInfo) {

	HRESULT result;
	result = S_OK;

    if (envP->fault_occurred)
	{
        result = S_FALSE;
	}
	// Return result
     return xmlrpc_build_value(envP, "i", (xmlrpc_int32)result);
}

/*
* Server run
*/
int main(int           const argc, 
		const char ** const argv) {

    struct xmlrpc_method_info3 const methodInfo1 = {
        /* .methodName     = */ "RMU1Connection.set",
        /* .methodFunction = */ &RMU1Connection_set,
    };
    struct xmlrpc_method_info3 const methodInfo2 = {
        /* .methodName     = */ "RMU1ScanInit.set",
        /* .methodFunction = */ &RMU1ScanInit_set,
    };
    struct xmlrpc_method_info3 const methodInfo3 = {
        /* .methodName     = */ "RMU1ScanStop.set",
        /* .methodFunction = */ &RMU1ScanStop_set,
    };
    xmlrpc_server_abyss_parms serverparm;
    xmlrpc_registry * registryP;
    xmlrpc_env env;
    xmlrpc_env_init(&env);

    registryP = xmlrpc_registry_new(&env);

    xmlrpc_registry_add_method3(&env, registryP, &methodInfo1);
    xmlrpc_registry_add_method3(&env, registryP, &methodInfo2);
    xmlrpc_registry_add_method3(&env, registryP, &methodInfo3);

    /* In the modern form of the Abyss API, we supply parameters in memory
       like a normal API.  We select the modern form by setting
       config_file_name to NULL: 
    */
    serverparm.config_file_name = NULL;
    serverparm.registryP        = registryP;
    serverparm.port_number      = atoi("8080");
    serverparm.log_file_name    = "log/xmlrpc_log";
	serverparm.uri_path			= "/RPC2";


    printf("Running XML-RPC server...\n");

    xmlrpc_server_abyss(&env, &serverparm, XMLRPC_APSIZE(log_file_name));

    return 0;
}