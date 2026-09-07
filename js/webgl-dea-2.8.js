/* V2.8
 * Copyright 2010-2015, Digital Epigraphy and Archaeology Group, University of 
 * Florida, Angelos Barmpoutis, Eleni Bozia, Robert Wagman.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain this copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce this
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * When this program is used for academic purposes, the following
 * article must be cited: A. Barmpoutis, E. Bozia, R. S. Wagman, "A novel 
 * framework for 3D reconstruction and analysis of ancient inscriptions", 
 * Journal of Machine Vision and Applications, 2010, Vol.21(6), p.989-998
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
 
 function DEAobject(toolbox)
 {
	this.gl=toolbox.gl_canvas.gl;
	this.camera=toolbox.camera;
	this.object_is_loaded=false;
	this.obj=new Array();
	this.shaderProgram=null;
 }
 
 DEAobject.prototype.load=function(dea_rid)
 {
	this.dea_rid=dea_rid;
	var file_request;
	if (window.XMLHttpRequest)
  	{// code for IE7+, Firefox, Chrome, Opera, Safari
  		file_request=new XMLHttpRequest();
 	}
	else
  	{// code for IE6, IE5
  		file_request=new ActiveXObject("Microsoft.XMLHTTP");
  	}
	var self=this;
	file_request.onreadystatechange=function()
  	{
		if (file_request.readyState==4 && file_request.status==200)
		self.handleFirstLoadedObject(file_request.responseText);
	}
	file_request.open("GET",this.dea_rid+".init",true);
	file_request.send();
 }
 
 DEAobject.prototype.handleFirstLoadedObject=function(txt) 
 {
	var lines=txt.split("#");
	var num_of_objects=lines[0];

	for(var i=0;i<num_of_objects;i++)
	{
		this.obj[i]=new webGLshape(this.gl);
		this.obj[i].fid=i;
		this.obj[i].filename=this.dea_rid;
		var hm3Dobj=this.obj[i];
		var xyz=new Float32Array(lines[i*3+1].split(","));
		var nrm=new Float32Array(lines[i*3+2].split(","));
		var tri=new Uint16Array(lines[i*3+3].split(","));
		hm3Dobj.setXYZ(xyz);
		hm3Dobj.setTRI(tri);
		hm3Dobj.setNormals(nrm);
		hm3Dobj.setColors(xyz);
	}
	if(this.shaderProgram==null)
	{
		this.shaderProgram=this.createShaders();
		this.gl.uniform3f(this.shaderProgram.ambientColorUniform,0.1,0.1,0.1);

		var normalMatrix = mat3.create();
		mat4.toInverseMat3(this.camera.mvMatrix, normalMatrix);
		mat3.transpose(normalMatrix);
		this.gl.uniformMatrix3fv(this.shaderProgram.nMatrixUniform, false, normalMatrix);
		this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.camera.pMatrix);
		this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.camera.mvMatrix);
	
		this.gl.uniform1i(this.shaderProgram.useLightingUniform, true);
		this.gl.uniform1i(this.shaderProgram.useColorsUniform, false);
		this.gl.uniform3fv(this.shaderProgram.lightingDirectionUniform, this.camera.getLightingDirection());
		this.gl.uniform3f(this.shaderProgram.directionalColorUniform,0.9,0.9,0.9);
		this.gl.uniform1i(this.shaderProgram.samplerUniform, 0);
	}
	this.object_is_loaded=true;
	for(var i=0;i<num_of_objects;i++)
	{
		this.obj[i].downloadLowRes(this.dea_rid,i);
	}
}

DEAobject.prototype.draw=function()
{
	var gl=this.gl;
	gl.useProgram(this.shaderProgram);
	
	if(this.camera.projection_changed)
	{
		this.camera.projection_changed=false;
		gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.camera.pMatrix);
	}	
	
	if(this.camera.view_changed)
	{
		this.camera.view_changed=false;
		this.camera.updatemvMatrix();
		gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.camera.mvMatrix);
		var normalMatrix = mat3.create();
		mat4.toInverseMat3(this.camera.mvMatrix, normalMatrix);
		mat3.transpose(normalMatrix);
		this.gl.uniformMatrix3fv(this.shaderProgram.nMatrixUniform, false, normalMatrix);
	}
	
	if(this.camera.light_changed)
	{
		this.camera.light_changed=false;
		gl.uniform3fv(this.shaderProgram.lightingDirectionUniform, this.camera.getLightingDirection());	
	}
	
	for(var i=0;i<this.obj.length;i++)
		{
			this.obj[i].draw(this.shaderProgram);
		}
}

DEAobject.prototype.createFragmentShader=function()
    {
		var gl=this.gl;
		var source="";
    	 source+="	precision mediump float;		";
	 source+="	varying vec3 vLightWeighting;	";

    	 source+="	void main(void) {			";
        source+="	gl_FragColor = vec4(vec3(1,1,1) * vLightWeighting, 1);	";
    	 source+="	}";
	
	 var shader = gl.createShader(gl.FRAGMENT_SHADER);
	 gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }
 
DEAobject.prototype.createVertexShader=function()
    {
		var gl=this.gl;
        var source="";
    	 source+="	attribute vec3 aVertexPosition;		";
    	 source+="	attribute vec3 aVertexNormal;		";
	 	 source+="	attribute vec3 aVertexColor;		";
	 source+="	uniform mat4 uMVMatrix;			";
   	 source+="	uniform mat4 uPMatrix;			";
    	 source+="	uniform mat3 uNMatrix;			";
    	 source+="	uniform vec3 uAmbientColor;			";
	 source+="	uniform vec3 uLightingDirection;		";
    	 source+="	uniform vec3 uDirectionalColor;		";
	 source+="	uniform bool uUseLighting;			";
	 source+="	uniform bool uUseColors;			";
	 source+="	varying vec3 vLightWeighting;		";

    	 source+="	void main(void) {	";
        source+="	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);	";
		source+="	if (!uUseLighting) {	";
        source+="	vLightWeighting = vec3(1.0, 1.0, 1.0);	";
        source+="	} else {	";
        source+="	vec3 transformedNormal = normalize(uNMatrix * aVertexNormal);	";
        source+="	float directionalLightWeighting = max(dot(transformedNormal, uLightingDirection), 0.0);	";
        source+="	vLightWeighting = uAmbientColor + uDirectionalColor * directionalLightWeighting;	";
        source+="	}";
		source+="	if (uUseColors) {	";
		source+="	vLightWeighting *= aVertexColor;	";
        source+="	}";
		source+="	}";
	
	 var shader = gl.createShader(gl.VERTEX_SHADER);
	 gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }
 
 DEAobject.prototype.createShaders=function() {
		var gl=this.gl;
        var fragmentShader = this.createFragmentShader(gl);
        var vertexShader = this.createVertexShader(gl);

        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert("Could not initialise shaders");
        }

        gl.useProgram(shaderProgram);

        shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

        shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
        gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

		shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
        gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
		
        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
        shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
        shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
        shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
        shaderProgram.useColorsUniform = gl.getUniformLocation(shaderProgram, "uUseColors");
        shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
        shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
        shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");

	 return shaderProgram;
    }
 
 function DEAheightmap(toolbox)
 {
	this.gl=toolbox.gl_canvas.gl;
	this.camera=toolbox.camera;
	this.tmpImage = new Image();
	this.Dpatch=new Array();
	this.Dpatch_now=0;
	this.progressive_loading=false;
	this.basis=new webGLshape(this.gl);
	this.images=new Array();
	this.images_light_dir=new Array();
	this.loading_image=0;
	this.waiting_for_download=false;
	
	this.width=0;
	this.height=0;
	
	this.cm_height=10;
	
	this.use3Dimensions=true;
	this.textureMode=0;
	this.useLighting=true;
	this.zScale=1;
	this.depth_range=34.901;//12.0345;
	this.colorWeight=1;
	this.colorWeight2=0;
	this.colorWeight3=0;
	this.colorWeight4=0;
	
	this.D_is_loaded=false;
	
	this.shader_changed=true;
	
	/*this.mvMatrix = mat4.create();
	mat4.identity(this.mvMatrix);

	this.pMatrix = mat4.create();
	mat4.perspective(45, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0, this.pMatrix);
	this.projection_changed=true;
	this.view_changed=true;
	this.light_changed=true;*/
	
	this.shaderProgram=null;
 }
 
 DEAheightmap.prototype.set3Dmode=function(flag)
 {
	this.use3Dimensions=flag;
	this.shader_changed=true;
 }
 
 DEAheightmap.prototype.setTextureMode=function(value)
 {
	this.textureMode=value;
	this.shader_changed=true;
 }
 
 DEAheightmap.prototype.setLights=function(flag)
 {
	this.useLighting=flag;
	this.shader_changed=true;
 }

DEAheightmap.prototype.getPixelUV=function(x,y)
{
	return this.basis.onPlane(x,y);
}

DEAheightmap.prototype.getPixelInSpace=function(x,y)
{
	var a=this.basis.onPlane(x,y);
	a[0]=a[0]*(this.basis.corners[3]-this.basis.corners[0])+this.basis.corners[0];
	a[1]=a[1]*(this.basis.corners[7]-this.basis.corners[1])+this.basis.corners[1];
	return a;
}

DEAheightmap.prototype.getPixelLocation=function(x,y)
{
	var a=this.basis.onPlane(x,y);
	a[0]=Math.floor(a[0]*this.width);
	a[1]=Math.floor(a[1]*this.height);
	
	if(a[0]<0 || a[1]<0 || a[0]>=this.width || a[1]>=this.height)
	{
		a[0]=-1;
		a[1]=-1;
	}
	
	return a;
}
 
 DEAheightmap.prototype.setImagePath=function(path,light_dir)
 {
	var i=this.images.length;
	this.images[i]=path;
	this.images_light_dir[i]=light_dir;
 }
 
 DEAheightmap.prototype.loadAll=function()
 {
	this.tmpImage = new Image();
	var self=this;
	this.tmpImage.onload = function () {
		if(self.loading_image==0)
			self.handleLoadedD();
		else self.handleLoadedI();
    }
	this.waiting_for_download=true;
    this.tmpImage.src = this.images[this.loading_image];
 }
 
 DEAheightmap.prototype.handleLoadedD=function() {
 
	this.width=this.tmpImage.width;
	this.height=this.tmpImage.height;
	this.zScale=this.height/(2*0.8*this.depth_range);
	
	if(this.width/this.height>this.gl.viewportWidth/this.gl.viewportHeight)
		this.zoom=(this.gl.viewportWidth/this.gl.viewportHeight)/(this.width/this.height);
	
	if(this.shaderProgram==null)
	{
		this.shaderProgram=this.createShaders();
	this.gl.uniform3f(this.shaderProgram.ambientColorUniform,0.1,0.1,0.1);

	var normalMatrix = mat3.create();
    mat4.toInverseMat3(this.camera.mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix);
    this.gl.uniformMatrix3fv(this.shaderProgram.nMatrixUniform, false, normalMatrix);
	this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.camera.mvMatrix);
	
    this.gl.uniform1i(this.shaderProgram.useLightingUniform, this.useLighting);
	this.gl.uniform3fv(this.shaderProgram.lightingDirectionUniform, this.camera.getLightingDirection());
    this.gl.uniform3f(this.shaderProgram.directionalColorUniform,0.9,0.9,0.9);
	this.gl.uniform1i(this.shaderProgram.samplerUniform, 0);
	this.gl.uniform1i(this.shaderProgram.textureMode, this.textureMode);
	this.gl.uniform1i(this.shaderProgram.use3DimensionsUniform, this.use3Dimensions);
	
	this.gl.uniform1f(this.shaderProgram.zScale, this.zScale);
	
	this.gl.uniform1f(this.shaderProgram.colorWeight, this.colorWeight);
	this.gl.uniform1f(this.shaderProgram.colorWeight2, this.colorWeight2);
	this.gl.uniform1f(this.shaderProgram.colorWeight3, this.colorWeight3);
	this.gl.uniform1f(this.shaderProgram.colorWeight4, this.colorWeight4);
	}
 
	var tmpCanvas = document.createElement('canvas');
	tmpCanvas.width = this.width;
	tmpCanvas.height = this.height;
	var tmpCtx = tmpCanvas.getContext('2d');
	tmpCtx.drawImage(this.tmpImage, 0, 0);
	this.hmData = tmpCtx.getImageData(0, 0, this.width, this.height);

	this.basis.setCorners([-this.width*0.8/this.height, 0.8,0,(this.width-2)*0.8/this.height, 0.8,0,-this.width*0.8/this.height, -(this.height-2)*0.8/this.height,0]);
	//this.basis.setXYZ([-this.D.width*0.8/this.D.height, 0.8,0,this.D.width*0.8/this.D.height, 0.8,0,-this.D.width*0.8/this.D.height, -0.8,0]);
	//this.basis.setUV([1/8+1/16,7.9/8,1/8+1/16,7.9/8,1/8+1/16,7.9/8]);
	//this.basis.setLIN([0,1,0,2]);
	
	this.progressive_loading=true;
	this.progressive_loading_y=0;
	this.progressive_loading_x=0;
	this.Dpatch_now=0;
	this.waiting_for_download=false;
	this.load_next_part();
	this.D_is_loaded=true;
	
	}
 
  DEAheightmap.prototype.handleLoadedI=function() {
 
    var tmpCanvas = document.createElement('canvas');
	tmpCanvas.width = this.tmpImage.width;
	tmpCanvas.height = this.tmpImage.height;
	var tmpCtx = tmpCanvas.getContext('2d');
	tmpCtx.drawImage(this.tmpImage, 0, 0);
	this.tmpData = tmpCtx.getImageData(0, 0, this.tmpImage.width, this.tmpImage.height);

	this.progressive_loading_y=0;
	this.progressive_loading_x=0;
	this.Dpatch_now=0;
	this.waiting_for_download=false;
	}
 
 DEAheightmap.prototype.createInscriptionFragment=function(hmData,tx,ty,w,h)
    {
	var i=this.Dpatch.length;
	this.Dpatch[i]=new webGLshape(this.gl);
	var hm3Dobj=this.Dpatch[i];
	
	var xyz=new Float32Array(w*h*3);
	var nrm=new Float32Array(w*h*3);
	var clr=new Float32Array(w*h*3);
	var tri=new Uint16Array((w-1)*(h-1)*6);
	var poi=new Uint16Array((w-1)*(h-1));
	var lin=new Uint16Array((w-1)*(h-1)*4);
	var j=0;
	var k=0;
	var t=0;
	var l=0;
	var p=0;
	var dx=2.0/hmData.height; //Correct is:  2.0/hmData.height;
	var mg=0;
	var indx=0;
	for(var y=ty;y<ty+h;y++)
	{
		for(var x=tx;x<tx+w;x++)
		{
			xyz[j]=(x*2.0-hmData.width)*0.8/hmData.height;
			xyz[j+1]=-(y*2.0-hmData.height)*0.8/hmData.height;
			indx=(y*hmData.width+x)*4;
			xyz[j+2]=(0.299*hmData.data[indx]+0.587*hmData.data[indx+1]+0.114*hmData.data[indx+2])/255;
			//clr[j]=1+(hmData.data[indx]-xyz[j+2])/255;
			//clr[j+1]=1-(0.1943*(hmData.data[indx+2]-xyz[j+2])+0.5095*(hmData.data[indx]-xyz[j+2]))/255;
			//clr[j+2]=1+(hmData.data[indx+2]-xyz[j+2])/255;
			clr[j]=1;
			clr[j+1]=1;
			clr[j+2]=1;
			xyz[j+2]/=this.zScale;
			if(x>0 && y>0)
			{	nrm[j]=(-xyz[j+2]+xyz[j+2-3]-xyz[j+2-w*3]+xyz[j+2-3-w*3])/(2*dx);
				nrm[j+1]=(xyz[j+2]-xyz[j+2-w*3]+xyz[j+2-3]-xyz[j+2-w*3-3])/(2*dx);
			}
			else
			{
				nrm[j]=0;
				nrm[j+1]=0;
			}	
			nrm[j+2]=1;
			mg=Math.sqrt(nrm[j]*nrm[j]+nrm[j+1]*nrm[j+1]+nrm[j+2]*nrm[j+2]);
			nrm[j]/=mg;
			nrm[j+1]/=mg;
			nrm[j+2]/=mg;

			if(x<tx+w-1 && y<ty+h-1 && hmData.data[(y*hmData.width+x)*4+3]!=0)
			{
				tri[k]=t;
				tri[k+1]=t+w+1;
				tri[k+2]=t+1;
				k+=3;
				tri[k]=t;
				tri[k+1]=t+w;
				tri[k+2]=t+w+1;
				k+=3;
				
				poi[p]=t;
				p+=1;
				
				lin[l]=t;
				lin[l+1]=t+1;
				l+=2;
				lin[l]=t;
				lin[l+1]=t+w;
				l+=2;
			}
			j+=3;
			t+=1;
		}
	}
	hm3Dobj.setXYZ(xyz);
	hm3Dobj.setPOI(poi);
	hm3Dobj.setLIN(lin);
	hm3Dobj.setTRI(tri);
	hm3Dobj.setNormals(nrm);
	hm3Dobj.setColors(clr);
	hm3Dobj.vertexColor2Buffer=hm3Dobj.vertexColorBuffer;
	hm3Dobj.vertexColor3Buffer=hm3Dobj.vertexColorBuffer;
	hm3Dobj.vertexColor4Buffer=hm3Dobj.vertexColorBuffer;
	}

 DEAheightmap.prototype.createTextureFragment=function(hmData,tx,ty,w,h)
    {
	var i=this.Dpatch_now;
	var hm3Dobj=this.Dpatch[i];
	
	var clr=new Float32Array(w*h*3);
	var indx=0;
	var j=0;
	for(var y=ty;y<ty+h;y++)
	{
		for(var x=tx;x<tx+w;x++)
		{
			indx=(y*hmData.width+x)*4;
			clr[j]=hmData.data[indx]/255;
			clr[j+1]=hmData.data[indx+1]/255;
			clr[j+2]=hmData.data[indx+2]/255;
			j+=3;
		}
	}
	if(this.loading_image==1) hm3Dobj.setColors(clr);
	else if(this.loading_image==2) hm3Dobj.setColors2(clr);
	else if(this.loading_image==3) hm3Dobj.setColors3(clr);
	else if(this.loading_image==4) hm3Dobj.setColors4(clr);
	this.Dpatch_now+=1;
	}
	
DEAheightmap.prototype.getLoadingProgress=function()
{
	if(!this.progressive_loading) return 0;
	else
	{
		if(this.waiting_for_download)
			return 100*this.loading_image/this.images.length;
		else
		return 100*(this.loading_image+(this.progressive_loading_y*this.width+this.progressive_loading_x)/(this.height*this.width))/this.images.length;
	}
}
	
//SPLIT THE INSCRIPTION INTO 256x256 PATCHES (DUE TO INT16 LIMITATION OF VERTEX INDEXING AND FOR MEMORY EFFICIENCY)
 DEAheightmap.prototype.load_next_part=function()
 {
	if(this.waiting_for_download) return;
	
	if(this.progressive_loading_y<this.hmData.height)
		{
			if(this.progressive_loading_x<this.hmData.width)
			{
		//for(var y=0;y<hmData.height;y+=254)
		//	for(var x=0;x<hmData.width;x+=254)
		
				if(this.loading_image==0)
					this.createInscriptionFragment(this.hmData,this.progressive_loading_x,this.progressive_loading_y,Math.min(this.progressive_loading_x+256,this.width)-this.progressive_loading_x,Math.min(this.progressive_loading_y+256,this.height)-this.progressive_loading_y);
				else	
					this.createTextureFragment(this.tmpData,this.progressive_loading_x,this.progressive_loading_y,Math.min(this.progressive_loading_x+256,this.width)-this.progressive_loading_x,Math.min(this.progressive_loading_y+256,this.height)-this.progressive_loading_y);
				this.progressive_loading_x+=254;
			}
			else 
			{
				this.progressive_loading_x=0;
				this.progressive_loading_y+=254;
			}
		}
		else 
		{
			this.loading_image+=1;
			if(this.loading_image<this.images.length)
			{
				this.loadAll();
			}
			else this.progressive_loading=false;
		}
 }
 
 DEAheightmap.prototype.getData=function(p1,p2,num_of_parallels)
 {
	var mag=Math.sqrt((p1[0]-p2[0])*(p1[0]-p2[0])+(p1[1]-p2[1])*(p1[1]-p2[1]));
	var num_of_samples=Math.round(mag);
	
	var xyz=new Float32Array(num_of_parallels*num_of_samples);
	
	var dir=[(p2[0]-p1[0])/mag,(p2[1]-p1[1])/mag];
	
	var angle=Math.atan2(dir[1],dir[0])+Math.PI/2;
	
	var vdir=[Math.cos(angle),Math.sin(angle)];
		
	var parallel_id=Math.floor(num_of_parallels/2);
	
	var idx=0;
	var x=0;
	var y=0;
	var indx=0;
	for(var i=0;i<num_of_samples;i++)
	{
		for(var j=0;j<num_of_parallels;j++)
		{
			x=Math.round(p1[0]+i*dir[0]+(j-parallel_id)*vdir[0]);
			y=Math.round(p1[1]+i*dir[1]+(j-parallel_id)*vdir[1]);
			
			indx=(y*this.hmData.width+x)*4;
			xyz[idx]=(0.299*this.hmData.data[indx]+0.587*this.hmData.data[indx+1]+0.114*this.hmData.data[indx+2])*(this.hmData.height/(0.8*2))/(255*this.zScale);
			
			idx+=1;
		}
	}
	
	return xyz;
 }

	
 DEAheightmap.prototype.draw=function()
 {
	var gl=this.gl;
	gl.useProgram(this.shaderProgram);	
	
	if(this.camera.projection_changed)
	{
		this.camera.projection_changed=false;
		gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.camera.pMatrix);
		var modelViewPerspMatrix = mat4.create();
		mat4.multiply(this.camera.pMatrix, this.camera.mvMatrix, modelViewPerspMatrix);
		this.basis.projectCorners(modelViewPerspMatrix,gl.viewportWidth,gl.viewportHeight);
	}	
	
	if(this.shader_changed)
	{
		this.shader_changed=false;
		gl.uniform1i(this.shaderProgram.use3DimensionsUniform, this.use3Dimensions);
		gl.uniform1i(this.shaderProgram.textureMode, this.textureMode);
		gl.uniform1i(this.shaderProgram.useLightingUniform, this.useLighting);
	}
	
	if(this.progressive_loading)
		this.load_next_part();
	
	if(this.camera.view_changed)
	{
		this.camera.view_changed=false;
		this.camera.updatemvMatrix();
		gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.camera.mvMatrix);
		
		var modelViewPerspMatrix = mat4.create();
		mat4.multiply(this.camera.pMatrix, this.camera.mvMatrix, modelViewPerspMatrix);
		this.basis.projectCorners(modelViewPerspMatrix,gl.viewportWidth,gl.viewportHeight);
	}
	
	if(this.camera.light_changed)
	{
		this.camera.light_changed=false;
		var lightingDirection = this.camera.getLightingDirection();
		gl.uniform3fv(this.shaderProgram.lightingDirectionUniform, lightingDirection);

		var min_negative=0;
		var positive=0;
		
		if(this.images.length>1)
		{	this.colorWeight=lightingDirection[0]*this.images_light_dir[1][0]+lightingDirection[1]*this.images_light_dir[1][1]+lightingDirection[2]*this.images_light_dir[1][2];
			if(this.colorWeight<=0) 
			{
				if(min_negative>this.colorWeight) min_negative=this.colorWeight;
			}
			else positive+=1;
		}
		if(this.images.length>2)
		{
			this.colorWeight2=lightingDirection[0]*this.images_light_dir[2][0]+lightingDirection[1]*this.images_light_dir[2][1]+lightingDirection[2]*this.images_light_dir[2][2];
			if(this.colorWeight2<=0) 
			{
				if(min_negative>this.colorWeight2) min_negative=this.colorWeight2;
			}
			else positive+=1;
		
		}
		if(this.images.length>3)
		{
			this.colorWeight3=lightingDirection[0]*this.images_light_dir[3][0]+lightingDirection[1]*this.images_light_dir[3][1]+lightingDirection[2]*this.images_light_dir[3][2];
			if(this.colorWeight3<=0) 
			{
				if(min_negative>this.colorWeight3) min_negative=this.colorWeight3;
			}
			else positive+=1;
		
		}
		if(this.images.length>4)
		{
			this.colorWeight4=lightingDirection[0]*this.images_light_dir[4][0]+lightingDirection[1]*this.images_light_dir[4][1]+lightingDirection[2]*this.images_light_dir[4][2];
			if(this.colorWeight4<=0) 
			{
				if(min_negative>this.colorWeight4) min_negative=this.colorWeight4;
			}
			else positive+=1;
		}
		
		if(this.images.length==2)
		{
			this.colorWeight=1;
			this.colorWeight2=0;
			this.colorWeight3=0;
			this.colorWeight4=0;
		}
		else if(this.images.length>2)
		{
		if(positive>0)
		{
			if(this.colorWeight<=0) this.colorWeight=0;
			if(this.colorWeight2<=0) this.colorWeight2=0;
			if(this.colorWeight3<=0) this.colorWeight3=0;
			if(this.colorWeight4<=0) this.colorWeight4=0;
			var sum=this.colorWeight+this.colorWeight2+this.colorWeight3+this.colorWeight4;
			this.colorWeight/=sum;
			this.colorWeight2/=sum;
			this.colorWeight3/=sum;
			this.colorWeight4/=sum;
		}
		else
		{
			if(this.colorWeight<0) this.colorWeight-=min_negative; 
			if(this.colorWeight2<0) this.colorWeight2-=min_negative; 
			if(this.colorWeight3<0) this.colorWeight3-=min_negative; 
			if(this.colorWeight4<0) this.colorWeight4-=min_negative; 
			var sum=this.colorWeight+this.colorWeight2+this.colorWeight3+this.colorWeight4;
			this.colorWeight/=sum;
			this.colorWeight2/=sum;
			this.colorWeight3/=sum;
			this.colorWeight4/=sum;
		}
		}	
		gl.uniform1f(this.shaderProgram.colorWeight, this.colorWeight);
		gl.uniform1f(this.shaderProgram.colorWeight2, this.colorWeight2);
		gl.uniform1f(this.shaderProgram.colorWeight3, this.colorWeight3);
		gl.uniform1f(this.shaderProgram.colorWeight4, this.colorWeight4);
	}
	
	for(var i=0;i<this.Dpatch.length;i++)
	{
		this.Dpatch[i].drawHeightmap(this.shaderProgram);
	}
	
	//this.basis.draw(this.shaderProgram);
 }

 DEAheightmap.prototype.setDrawModePoints=function()
 {
	for(var i=0;i<this.Dpatch.length;i++)
		this.Dpatch[i].setDrawModePoints();
 }
 
 DEAheightmap.prototype.setDrawModeLines=function()
 {
	for(var i=0;i<this.Dpatch.length;i++)
		this.Dpatch[i].setDrawModeLines();
 }
 
  DEAheightmap.prototype.setDrawModeTriangles=function()
 {
	for(var i=0;i<this.Dpatch.length;i++)
		this.Dpatch[i].setDrawModeTriangles();
 }
 
DEAheightmap.prototype.createFragmentShader=function()
    {
		var gl=this.gl;
        var source="";
    	 source+="	precision mediump float;		";
	 source+="	varying vec3 vLightWeighting;	";

    	 source+="	void main(void) {			";
        source+="	gl_FragColor = vec4(vec3(1,1,1) * vLightWeighting, 1);	";
    	 source+="	}";
	
	 var shader = gl.createShader(gl.FRAGMENT_SHADER);
	 gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }
 
DEAheightmap.prototype.createVertexShader=function()
    {
		var gl=this.gl;
        var source="";
    	 source+="	attribute vec3 aVertexPosition;		";
    	 source+="	attribute vec3 aVertexNormal;		";
	 	 source+="	attribute vec3 aVertexColor;		";
		 source+="	attribute vec3 aVertexColor2;		";
		 source+="	attribute vec3 aVertexColor3;		";
		 source+="	attribute vec3 aVertexColor4;		";
		 source+="	uniform float uVertexColor;			";		
		source+="	uniform float uVertexColor2;			";
		source+="	uniform float uVertexColor3;			";
		 source+="	uniform float uVertexColor4;			";
	 source+="	uniform mat4 uMVMatrix;			";
   	 source+="	uniform mat4 uPMatrix;			";
    	 source+="	uniform mat3 uNMatrix;			";
    	 source+="	uniform vec3 uAmbientColor;			";
	 source+="	uniform vec3 uLightingDirection;		";
    	 source+="	uniform vec3 uDirectionalColor;		";
	 source+="	uniform bool uUseLighting;			";
	 source+="	uniform int uTextureMode;			";
	 source+="	uniform bool u3Dimensions;			";
	 source+="	uniform bool uDepthmap;			";
	 source+="	uniform float uZscale;			";
	 source+="	varying vec3 vLightWeighting;		";

    	 source+="	void main(void) {	";
		 source+="  gl_PointSize=1.0;";
		 source+="	if (!u3Dimensions) {	";
        source+="	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition.x,aVertexPosition.y,0.0, 1.0);	";
		source+="	} else {	";
		source+="	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);	";
		source+="	}";
		source+="	if (!uUseLighting) {	";
        source+="	vLightWeighting = vec3(1.0, 1.0, 1.0);	";
        source+="	} else {	";
        source+="	vec3 transformedNormal = normalize(uNMatrix * aVertexNormal);	";
        source+="	float directionalLightWeighting = max(dot(transformedNormal, uLightingDirection), 0.0);	";
        source+="	vLightWeighting = uAmbientColor + uDirectionalColor * directionalLightWeighting;	";
        //source+="	vLightWeighting = vec3((aVertexPosition.z+0.1102)/0.2204, (aVertexPosition.z+0.1102)/0.2204,(aVertexPosition.z+0.1102)/0.2204);	";
		source+="	}";
		source+="	if (uTextureMode>0) {	";
//		source+="	vLightWeighting *= aVertexColor;	";
		source+="	if (uTextureMode==1) {	";
		source+="   vLightWeighting *= vec3(aVertexPosition.z* uZscale, aVertexPosition.z* uZscale,aVertexPosition.z* uZscale); ";
		source+="	} else if (uTextureMode==2){	";
		source+="	vLightWeighting *= vec3(1.0-aVertexNormal.z*aVertexNormal.z*aVertexNormal.z, 1.0-aVertexNormal.z*aVertexNormal.z*aVertexNormal.z,1.0-aVertexNormal.z*aVertexNormal.z*aVertexNormal.z);	";
		source+="	} else {	";
		source+="	vLightWeighting = aVertexColor*uVertexColor+aVertexColor2*uVertexColor2+aVertexColor3*uVertexColor3+aVertexColor4*uVertexColor4;	";
		source+="	}";
        source+="	}";
		source+="	}";
	
	 var shader = gl.createShader(gl.VERTEX_SHADER);
	 gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }
 
 DEAheightmap.prototype.createShaders=function() {
		var gl=this.gl;
        var fragmentShader = this.createFragmentShader();
        var vertexShader = this.createVertexShader();

        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert("Could not initialise shaders");
        }

        gl.useProgram(shaderProgram);

        shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

        shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
        gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

		shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
        gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
		
		shaderProgram.vertexColor2Attribute = gl.getAttribLocation(shaderProgram, "aVertexColor2");
        gl.enableVertexAttribArray(shaderProgram.vertexColor2Attribute);
		
		shaderProgram.vertexColor3Attribute = gl.getAttribLocation(shaderProgram, "aVertexColor3");
        gl.enableVertexAttribArray(shaderProgram.vertexColor3Attribute);
		
		shaderProgram.vertexColor4Attribute = gl.getAttribLocation(shaderProgram, "aVertexColor4");
        gl.enableVertexAttribArray(shaderProgram.vertexColor4Attribute);
		
        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
        shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
        shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
        shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
        shaderProgram.textureMode = gl.getUniformLocation(shaderProgram, "uTextureMode");
		shaderProgram.use3DimensionsUniform = gl.getUniformLocation(shaderProgram, "u3Dimensions");
        shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
        shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
        shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");
		shaderProgram.zScale=gl.getUniformLocation(shaderProgram,"uZscale");
		shaderProgram.colorWeight=gl.getUniformLocation(shaderProgram,"uVertexColor");
		shaderProgram.colorWeight2=gl.getUniformLocation(shaderProgram,"uVertexColor2");
		shaderProgram.colorWeight3=gl.getUniformLocation(shaderProgram,"uVertexColor3");
		shaderProgram.colorWeight4=gl.getUniformLocation(shaderProgram,"uVertexColor4");

	 return shaderProgram;
    }
 
 DEAheightmap.prototype.getHeightInCM=function()
 {
	return this.cm_height;
 }
 
 function DEAroi(p1,p2)
 {
	this.p1=p1;
	this.p2=p2;
 }
 
 function DEAannotation(gl_canvas,heightmap)
 {
	this.gl=gl_canvas.gl;
	this.heightmap=heightmap;
	
	this.rois=new Array();
	
	this.shaderProgram=createGUIShaders(this.gl);
	this.gl.uniform4f(this.shaderProgram.uColorMask,1,0,0,1);
	this.pMatrix=null;
	this.mvMatrix=null;
	
	this.local_mvMatrix=mat4.create();
	
	this.visible=false;
	this.enabled=true;
	
	this.line_x=new webGLshape(this.gl);
	this.line_x.setXYZ([0,0,0,1,0,0]);
	this.line_x.setLIN([0,1]);
	this.line_x.setUV([1/8+1/16,7.9/8,1/8+1/16,7.9/8]);
	
	this.line_state=0;
	this.p1=[0,0];
	this.p2=[0,0];
 }
 
 DEAannotation.prototype.setVisible=function(flag)
 {
	this.visible=flag;
	if(this.visible) 
		this.enabled=true;
 }
 
 DEAannotation.prototype.setEnabled=function(flag)
 {
	this.enabled=flag;
 }
 
 DEAannotation.prototype.draw=function(pMatrix, mvMatrix)
 {
	if(!this.visible) return;

	var gl=this.gl;
	
	gl.useProgram(this.shaderProgram);	
	
	this.pMatrix=pMatrix;
	this.mvMatrix=mvMatrix;
	
	gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, mvMatrix);
	
	if(this.enabled) this.gl.uniform4f(this.shaderProgram.uColorMask,1,0,0,1);
	else this.gl.uniform4f(this.shaderProgram.uColorMask,1,0,0,0.5);
	
	if(this.line_state==1)
	{
		this.line(this.p1,[this.p1[0], this.p2[1]]);
		this.line(this.p1,[this.p2[0], this.p1[1]]);
		this.line(this.p2,[this.p1[0], this.p2[1]]);
		this.line(this.p2,[this.p2[0], this.p1[1]]);
	}
	
	for(var i=0;i<this.rois.length;i++)
	{
		this.line(this.rois[i].p1,[this.rois[i].p1[0], this.rois[i].p2[1]]);
		this.line(this.rois[i].p1,[this.rois[i].p2[0], this.rois[i].p1[1]]);
		this.line(this.rois[i].p2,[this.rois[i].p1[0], this.rois[i].p2[1]]);
		this.line(this.rois[i].p2,[this.rois[i].p2[0], this.rois[i].p1[1]]);
	}
	
 }
 
 //rotate x-unit vector to the given line segment
 DEAannotation.prototype.line=function(p1,p2)
 {
  mat4.translate(this.mvMatrix,[p1[0], p1[1], 0],this.local_mvMatrix);
  mat4.rotate(this.local_mvMatrix,Math.atan2(p2[1]-p1[1], p2[0]-p1[0]),[0,0,1]);
  var d=Math.sqrt((p1[0]-p2[0])*(p1[0]-p2[0])+(p1[1]-p2[1])*(p1[1]-p2[1]));
  mat4.scale(this.local_mvMatrix,[d,d,d]);
  this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.local_mvMatrix);
  this.line_x.draw(this.shaderProgram);
 }
 
 DEAannotation.prototype.handleMouseMove=function(x,y,dx,dy,zoom)
 {
	if(!this.visible || !this.enabled) return;
 
	if(this.line_state==1)
	{
		this.p2=this.heightmap.getPixelInSpace(x,y);
	}
 }
 
 DEAannotation.prototype.handleMouseDown=function(x,y)
 {
	if(!this.visible || !this.enabled) return;
 
	if(this.line_state==0)
	{
		this.p1=this.heightmap.getPixelInSpace(x,y);
		this.p2=this.p1;
		this.line_state=1;
	}
	
 }
 
 DEAannotation.prototype.handleMouseUp=function(x,y)
 {
	if(this.line_state==1)
	{
		this.p2=this.heightmap.getPixelInSpace(x,y);
		this.line_state=0;
		this.rois[this.rois.length]=new DEAroi(this.p1,this.p2);
	}
}
 
 DEAannotation.prototype.handleMouseOut=function(x,y)
 {

 }
 
 function DEAplot(gl_canvas, max_width, max_height, num_of_plots, plot_id, messages)
 {
	this.gl=gl_canvas.gl;
	this.messages=messages;
	if(max_height*num_of_plots<=this.gl.viewportHeight)
	{
		this.width=max_width;
		this.height=max_height;
	}
	else
	{
		this.height=this.gl.viewportHeight/num_of_plots;
		this.width=max_width*this.height/max_height;
	}
	this.bottom=this.gl.viewportHeight-(this.height+19*2)*(plot_id+1);//19pixel tall is one text row
	this.left=this.gl.viewportWidth-this.width;
	this.top=plot_id*(this.height+19*2)+19*2;
	
	this.mvMatrix = mat4.create();
	mat4.identity(this.mvMatrix);
	this.pMatrix = mat4.create();
	this.shaderProgram=createGUIShaders(this.gl);
	//mat4.perspective(45, 1, 0.1, 100.0, this.pMatrix);
	mat4.ortho(-1, 1, -1,1,0.1,100.0, this.pMatrix);
	this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
    this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
	
	this.background=new webGLshape(this.gl);
	this.background.setXYZ([0.95, 0.95,  -2.5, -0.95, 0.95, -2.5, -0.95, -0.95, -2.5, 0.95, -0.95,  -2.5]);
	this.background.setTRI([0, 1, 2, 0, 2, 3]);
	this.background.setUV([1/8+1/16,7.9/8, 1/8+1/16,7.9/8, 1/8+1/16,7.9/8, 1/8+1/16,7.9/8]);
 
	this.line_plot=null;
	this.verticals_plot=null;
	this.grid_plot=null;
	this.rotY=0;
	this.rotX=0;
	this.visible=false;
	this.length_2d=0;
	this.length_3d=0;
 }
 
 DEAplot.prototype.setVisible=function(flag)
 {
	this.visible=flag;
 }
  
 DEAplot.prototype.setData=function(data,num_of_parallels,dpcm)
 {
	if(data.length==0) 
	{
		this.line_plot=null;
		this.verticals_plot=null;
		this.grid_plot=null;
		this.length_2d=0;
		this.length_3d=0;
		return;
	}
	var min=data[0];
	var max=data[0];
	for(var i=1;i<data.length;i++)
	{
		if(data[i]<min) min=data[i];
		if(data[i]>max) max=data[i];
	}
	var div=max-min;
	if(div==0) div=1;
	
	var num_of_samples=data.length/num_of_parallels;
	
	//Line plot
	var obj=new webGLshape(this.gl);
	var xyz=new Float32Array(num_of_samples*3);
	var uv=new Float32Array(num_of_samples*2);
	var lin=new Uint16Array((num_of_samples-1)*2);
	
	var parallel_id=Math.floor(num_of_parallels/2);
	
	var scale_x=1;
	var scale_z=1;
	
	if(num_of_samples>num_of_parallels)
		scale_z=num_of_parallels/num_of_samples;
	if(num_of_samples<num_of_parallels)
		scale_z=num_of_samples/num_of_parallels;
	
	this.length_2d=0;
	this.length_3d=0;
			
	for(var i=0;i<num_of_samples;i++)
	{
		xyz[i*3]=(1.8*i/(num_of_samples-1)-0.9)*scale_x;
		xyz[i*3+1]=1.8*(data[i*num_of_parallels+parallel_id]-min)/div-0.9;
		xyz[i*3+2]=(1.8*parallel_id/(num_of_parallels-1)-0.9)*scale_z;
		uv[i*2]=1/8+1/16;
		uv[i*2+1]=7.9/8;
		if(i<num_of_samples-1)
		{
			lin[i*2]=i;
			lin[i*2+1]=i+1;
		}
		if(i>0)
		{
			this.length_3d+=Math.sqrt((data[i*num_of_parallels+parallel_id]-data[(i-1)*num_of_parallels+parallel_id])*(data[i*num_of_parallels+parallel_id]-data[(i-1)*num_of_parallels+parallel_id])+1)/dpcm;
			this.length_2d+=1/dpcm;
		}
	}
	
	this.length_2d=Math.round(this.length_2d*1000)/1000;
	this.length_3d=Math.round(this.length_3d*1000)/1000;
	
	obj.setXYZ(xyz);
	obj.setUV(uv);
	obj.setLIN(lin);
	this.line_plot=obj;
	
	//Verticals plot
	obj=new webGLshape(this.gl);
	xyz=new Float32Array(num_of_samples*num_of_parallels*3);
	uv=new Float32Array(num_of_samples*num_of_parallels*2);
	lin=new Uint16Array((num_of_parallels-1)*num_of_samples*2);
		
	var idx=0;
	for(var i=0;i<num_of_samples;i++)
	{
		for(var j=0;j<num_of_parallels;j++)
		{
			xyz[(i*num_of_parallels+j)*3]=(1.8*i/(num_of_samples-1)-0.9)*scale_x;
			xyz[(i*num_of_parallels+j)*3+1]=1.8*(data[i*num_of_parallels+j]-min)/div-0.9;
			xyz[(i*num_of_parallels+j)*3+2]=(1.8*j/(num_of_parallels-1)-0.9)*scale_z;
			uv[(i*num_of_parallels+j)*2]=1/8+1/16;
			uv[(i*num_of_parallels+j)*2+1]=7.9/8;
			if(j<num_of_parallels-1)
			{
				lin[idx]=i*num_of_parallels+j;
				lin[idx+1]=i*num_of_parallels+j+1;
				idx+=2;
			}
		}
	}
	
	obj.setXYZ(xyz);
	obj.setUV(uv);
	obj.setLIN(lin);
	this.verticals_plot=obj;
	
	//Grid plot
	obj=new webGLshape(this.gl);
	xyz=new Float32Array(num_of_samples*num_of_parallels*3);
	uv=new Float32Array(num_of_samples*num_of_parallels*2);
	lin=new Uint16Array(((num_of_parallels-1)*(num_of_samples-1)*2+num_of_parallels-1+num_of_samples-1)*2);
		
	var idx=0;
	for(var i=0;i<num_of_samples;i++)
	{
		for(var j=0;j<num_of_parallels;j++)
		{
			xyz[(i*num_of_parallels+j)*3]=(1.8*i/(num_of_samples-1)-0.9)*scale_x;
			xyz[(i*num_of_parallels+j)*3+1]=1.8*(data[i*num_of_parallels+j]-min)/div-0.9;
			xyz[(i*num_of_parallels+j)*3+2]=(1.8*j/(num_of_parallels-1)-0.9)*scale_z;
			uv[(i*num_of_parallels+j)*2]=1/8+1/16;
			uv[(i*num_of_parallels+j)*2+1]=7.9/8;
			if(j<num_of_parallels-1)
			{
				lin[idx]=i*num_of_parallels+j;
				lin[idx+1]=i*num_of_parallels+j+1;
				idx+=2;
			}
			
			if(i<num_of_samples-1)
			{
				lin[idx]=i*num_of_parallels+j;
				lin[idx+1]=(i+1)*num_of_parallels+j;
				idx+=2;
			}
		}
	}
	
	obj.setXYZ(xyz);
	obj.setUV(uv);
	obj.setLIN(lin);
	this.grid_plot=obj;
 }
 
 DEAplot.prototype.onPlot=function(x,y)
 {
	if(!this.visible) return false;
	
	if(x>this.left && x<this.left+this.width && y>this.top && y<this.top+this.height)
		return true;
	else return false;
 }
 
 DEAplot.prototype.handleMouseMove=function(dx,dy)
 {
	if(!this.visible) return;
	this.rotY+=40000*dx/this.width;
	this.rotX+=40000*dy/this.height;
	
	if(this.rotY>360) this.rotY-=360;
	if(this.rotY<0) this.rotY+=360;
	
	if(this.rotX>90)this.rotX=90;
	else if(this.rotX<-90)this.rotX=-90;
 }
 
 DEAplot.prototype.drawCaption=function(txt)
 {
	if(!this.visible) return;
	if(this.line_plot==null) return;
	var gl=this.gl;

	this.gl.uniform4f(this.shaderProgram.uColorMask,1,1,1,1);
	gl.viewport(this.left, this.bottom-19, this.width, 19);
	this.messages.drawString(txt,[0,0,-2.5],[0.9*19/this.width,0.9,1],this.shaderProgram);
 }
 
 DEAplot.prototype.draw=function()
 {
	if(!this.visible) return;
	if(this.line_plot==null) return;
	var gl=this.gl;
	gl.useProgram(this.shaderProgram);

	this.gl.uniform4f(this.shaderProgram.uColorMask,1,1,1,1);
	gl.viewport(this.left, this.bottom+this.height+19, this.width, 19);
	this.messages.drawString("  Length 2d: "+this.length_2d+" cm  ",[0,0,-2.5],[0.9*19/this.width,0.9,1],this.shaderProgram);
	
	gl.viewport(this.left, this.bottom+this.height, this.width, 19);
	this.messages.drawString("  Length 3d: "+this.length_3d+" cm  ",[0,0,-2.5],[0.9*19/this.width,0.9,1],this.shaderProgram);
	
	
	gl.viewport(this.left, this.bottom, this.width, this.height);
	
	mat4.identity(this.mvMatrix);
    this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
	this.background.draw(this.shaderProgram);

	mat4.translate(this.mvMatrix,[0,0,-2.5]);
	
	mat4.rotate(this.mvMatrix,this.rotX*Math.PI/180,[1,0,0]);
	mat4.rotate(this.mvMatrix,this.rotY*Math.PI/180,[0,1,0]);
	this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
	
	var a=1;
	if(this.rotX>30 || this.rotX<-30)
			a=1;
	else if(this.rotX<=30 && this.rotX>0)
			a=this.rotX/30;
	else if(this.rotX<=0 && this.rotX>=-30)
			a=-this.rotX/30;
	
	if(this.grid_plot!=null)
	{
		this.gl.uniform4f(this.shaderProgram.uColorMask,0,0,0,a);
		this.grid_plot.draw(this.shaderProgram);
	}

	
	if(this.rotX>50 || this.rotX<-50)
			a=1;
	else if(this.rotX<=50 && this.rotX>0)
			a=this.rotX/50;
	else if(this.rotX<=0 && this.rotX>=-50)
			a=-this.rotX/50;
	
	if(this.verticals_plot!=null)
	{
		if((this.rotY>80 && this.rotY<100) || (this.rotY>260 && this.rotY<280))
			this.gl.uniform4f(this.shaderProgram.uColorMask,0,0,1,1*(1-a));
		else if(this.rotY>=100 && this.rotY<180) 
			this.gl.uniform4f(this.shaderProgram.uColorMask,0,0,1,(180-this.rotY)*(1-a)/80);
		else if(this.rotY>=180 && this.rotY<=260) 
			this.gl.uniform4f(this.shaderProgram.uColorMask,0,0,1,(1-(260-this.rotY)/80)*(1-a));
		else if(this.rotY<=80) 
			this.gl.uniform4f(this.shaderProgram.uColorMask,0,0,1,this.rotY/80*(1-a));
		else if(this.rotY>=280) 
			this.gl.uniform4f(this.shaderProgram.uColorMask,0,0,1,(360-this.rotY)*(1-a)/80);
		
		this.verticals_plot.draw(this.shaderProgram);
	}
	
	if(this.line_plot!=null)
	{
		//if((this.rotY<30 || this.rotY>330) || (this.rotY>150 && this.rotY<210))
			this.gl.uniform4f(this.shaderProgram.uColorMask,1,0,0,1);
		/*else if(this.rotY>=30 && this.rotY<90)
			this.gl.uniform4f(this.shaderProgram.uColorMask,1,0,0,(90-this.rotY)*(1-a)/60);
		else if(this.rotY>=90 && this.rotY<=150)
			this.gl.uniform4f(this.shaderProgram.uColorMask,1,0,0,(1-(150-this.rotY)/60)*(1-a));
		else if(this.rotY>=210 && this.rotY<270)
			this.gl.uniform4f(this.shaderProgram.uColorMask,1,0,0,(270-this.rotY)*(1-a)/60);
		else if(this.rotY>=270 && this.rotY<=350)
			this.gl.uniform4f(this.shaderProgram.uColorMask,1,0,0,(1-(350-this.rotY)/60)*(1-a));*/
		
		
			
		this.line_plot.draw(this.shaderProgram);
	}
	

}
 
 function DEAcaliber(gl_canvas,heightmap,messages)
 {
	this.gl=gl_canvas.gl;
	this.heightmap=heightmap;
	this.messages=messages;
	
	this.plots=Array();
	this.plots[0]=new DEAplot(gl_canvas,200,150,4,0,messages);
	this.plots[1]=new DEAplot(gl_canvas,200,150,4,1,messages);

	
	this.interacting_with_object=0;

	this.shaderProgram=createGUIShaders(this.gl);
	this.gl.uniform4f(this.shaderProgram.uColorMask,1,1,1,1);
	this.pMatrix=null;
	this.mvMatrix=null;
	
	this.local_mvMatrix=mat4.create();
	
	this.cm_height=heightmap.getHeightInCM();
	this.num_of_blocks=10;
	var circle_points=32;
	
	this.xTra=0;
	this.yTra=0;
	this.rot=0;
	this.hRot=0;
	this.vRot=0;
	
	this.gui_animation=0;//0: hidden, 1: fully visible, in between: partially visible
	this.lastTimeAction=(new Date().getTime())-4000;
    this.lastTimeDraw = 0;
    
	this.visible=false;
	this.enabled=true;
	
	var obj=new webGLshape(this.gl);
	var xyz=new Float32Array(this.num_of_blocks*3*4);
	var uv=new Float32Array(this.num_of_blocks*2*4);
	var tri=new Uint16Array(this.num_of_blocks*2*3);
	var corners=new Float32Array(4*3);
	var idx=0;
	var idx2=0;
	var idx3=0;
	
	//horizontal ruler
	var black=true;
	var base=0.8/this.cm_height;
	for(var i=0;i<this.num_of_blocks;i++)
	{
		xyz[idx]=0.8/this.cm_height+base;
		xyz[idx+1]=0;
		xyz[idx+2]=0;
		idx+=3;
		xyz[idx]=-0.8/this.cm_height+base;
		xyz[idx+1]=0;
		xyz[idx+2]=0;
		idx+=3;
		xyz[idx]=-0.8/this.cm_height+base;
		xyz[idx+1]=-0.8/this.cm_height;
		xyz[idx+2]=0;
		idx+=3;
		xyz[idx]=0.8/this.cm_height+base;
		xyz[idx+1]=-0.8/this.cm_height;
		xyz[idx+2]=0;
		idx+=3;
		
		tri[idx2]=0+i*4;
		tri[idx2+1]=1+i*4;
		tri[idx2+2]=2+i*4;
		idx2+=3;
		tri[idx2]=0+i*4;
		tri[idx2+1]=2+i*4;
		tri[idx2+2]=3+i*4;
		idx2+=3;
		
		if(black)
		{
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.1/8;
			idx3+=2;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.1/8;
			idx3+=2;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.1/8;
			idx3+=2;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.1/8;
			idx3+=2;
		}
		else
		{
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.9/8;
			idx3+=2;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.9/8;
			idx3+=2;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.9/8;
			idx3+=2;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.9/8;
			idx3+=2;
		}
		black=!black;
		base+=2*0.8/this.cm_height;
	}
	corners[0]=xyz[3];
	corners[1]=xyz[4];
	corners[2]=xyz[5];
	corners[3]=xyz[6];
	corners[4]=xyz[7];
	corners[5]=xyz[8];
	corners[6]=xyz[idx-3];
	corners[7]=xyz[idx-2];
	corners[8]=xyz[idx-1];
	corners[9]=xyz[idx-12];
	corners[10]=xyz[idx-11];
	corners[11]=xyz[idx-10];
	
	obj.setXYZ(xyz);
	obj.setTRI(tri);
	obj.setUV(uv);
	obj.setCorners(corners);
	this.h_ruler=obj;
	
	//vertical ruler
	obj=new webGLshape(this.gl);
	xyz=new Float32Array(this.num_of_blocks*3*4);
	uv=new Float32Array(this.num_of_blocks*2*4);
	tri=new Uint16Array(this.num_of_blocks*2*3);
	corners=new Float32Array(4*3);
	idx=0;
	idx2=0;
	idx3=0;
	black=false;
	base=0.8/this.cm_height;
	for(var i=0;i<this.num_of_blocks;i++)
	{
		xyz[idx]=0;
		xyz[idx+1]=-0.8/this.cm_height+base;
		xyz[idx+2]=0;
		idx+=3;
		xyz[idx]=0;
		xyz[idx+1]=0.8/this.cm_height+base;
		xyz[idx+2]=0;
		idx+=3;
		xyz[idx]=-0.8/this.cm_height;
		xyz[idx+1]=0.8/this.cm_height+base;
		xyz[idx+2]=0;
		idx+=3;
		xyz[idx]=-0.8/this.cm_height;
		xyz[idx+1]=-0.8/this.cm_height+base;
		xyz[idx+2]=0;
		idx+=3;
		
		tri[idx2]=0+i*4;
		tri[idx2+1]=1+i*4;
		tri[idx2+2]=2+i*4;
		idx2+=3;
		tri[idx2]=0+i*4;
		tri[idx2+1]=2+i*4;
		tri[idx2+2]=3+i*4;
		idx2+=3;
		
		if(black)
		{
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.1/8;
			idx3+=2;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.1/8;
			idx3+=2;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.1/8;
			idx3+=2;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.1/8;
			idx3+=2;
		}
		else
		{
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.9/8;
			idx3+=2;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.9/8;
			idx3+=2;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.9/8;
			idx3+=2;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.9/8;
			idx3+=2;
		}
		black=!black;
		base+=2*0.8/this.cm_height;
	}
	corners[0]=xyz[9];
	corners[1]=xyz[10];
	corners[3]=xyz[11];
	corners[3]=xyz[0];
	corners[4]=xyz[1];
	corners[5]=xyz[2];
	corners[6]=xyz[idx-9];
	corners[7]=xyz[idx-8];
	corners[8]=xyz[idx-7];
	corners[9]=xyz[idx-6];
	corners[10]=xyz[idx-5];
	corners[11]=xyz[idx-4];
	
	obj.setXYZ(xyz);
	obj.setTRI(tri);
	obj.setUV(uv);
	obj.setCorners(corners);
	this.v_ruler=obj;
	
	//vertical rotation circle
	obj=new webGLshape(this.gl);
	xyz=new Float32Array((circle_points/4+2)*3);
	uv=new Float32Array((circle_points/4+2)*2);
	tri=new Uint16Array((circle_points/4+1)*3);
	idx=0;
	idx2=0;
	idx3=0;
	for(var i=0;i<=circle_points/4;i++)
	{
		if(i==0)
		{
			xyz[idx]=0;
			xyz[idx+1]=0;
			xyz[idx+2]=0;
			idx+=3;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.1/8;
			idx3+=2;
		}
		xyz[idx]=Math.cos((i+circle_points/4)*2*Math.PI/circle_points)*2*0.8/this.cm_height;
		xyz[idx+1]=Math.sin((i+circle_points/4)*2*Math.PI/circle_points)*2*0.8/this.cm_height;
		xyz[idx+2]=0;
		idx+=3;
		uv[idx3]=1/8+1/16;
		uv[idx3+1]=7.7/8;
		idx3+=2;
		
		if(i<circle_points/4)
		{
			tri[idx2]=0;
			tri[idx2+1]=i+1;
			tri[idx2+2]=i+2;
		}
		idx2+=3;
	}
	obj.setXYZ(xyz);
	obj.setTRI(tri);
	obj.setUV(uv);
	obj.setCorners(xyz);
	this.v_cycle=obj;
	
	//horizontal rotation circle
	obj=new webGLshape(this.gl);
	xyz=new Float32Array((circle_points/4+2)*3);
	uv=new Float32Array((circle_points/4+2)*2);
	tri=new Uint16Array((circle_points/4+1)*3);
	idx=0;
	idx2=0;
	idx3=0;
	for(var i=0;i<=circle_points/4;i++)
	{
		if(i==0)
		{
			xyz[idx]=0;
			xyz[idx+1]=0;
			xyz[idx+2]=0;
			idx+=3;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.1/8;
			idx3+=2;
		}
		xyz[idx]=Math.cos((i-circle_points/4)*2*Math.PI/circle_points)*2*0.8/this.cm_height;
		xyz[idx+1]=Math.sin((i-circle_points/4)*2*Math.PI/circle_points)*2*0.8/this.cm_height;
		xyz[idx+2]=0;
		idx+=3;
		uv[idx3]=1/8+1/16;
		uv[idx3+1]=7.7/8;
		idx3+=2;
		
		if(i<circle_points/4)
		{
			tri[idx2]=0;
			tri[idx2+1]=i+1;
			tri[idx2+2]=i+2;
		}
		idx2+=3;
	}
	obj.setXYZ(xyz);
	obj.setTRI(tri);
	obj.setUV(uv);
	obj.setCorners(xyz);
	this.h_cycle=obj;
	
	//rotation circle
	obj=new webGLshape(this.gl);
	xyz=new Float32Array((circle_points+1)*3);
	uv=new Float32Array((circle_points+1)*2);
	tri=new Uint16Array(circle_points*3);
	corners=new Float32Array(4*3);
	idx=0;
	idx2=0;
	idx3=0;
	for(var i=0;i<circle_points;i++)
	{
		if(i==0)
		{
			xyz[idx]=0;
			xyz[idx+1]=0;
			xyz[idx+2]=0;
			idx+=3;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.5/8;
			idx3+=2;
		}
		xyz[idx]=Math.cos(i*2*Math.PI/circle_points)*1*0.8/this.cm_height;
		xyz[idx+1]=Math.sin(i*2*Math.PI/circle_points)*1*0.8/this.cm_height;
		xyz[idx+2]=0;
		idx+=3;
		uv[idx3]=1/8+1/16;
		uv[idx3+1]=7.1/8;
		idx3+=2;
		
		tri[idx2]=0;
		tri[idx2+1]=i+1;
		if(i==circle_points-1)
			tri[idx2+2]=1;
		else
			tri[idx2+2]=i+2;
		idx2+=3;
	}
	obj.setXYZ(xyz);
	obj.setTRI(tri);
	obj.setUV(uv);
	//obj.setCorners(corners);
	this.cycle=obj;
	
	//basis
	obj=new webGLshape(this.gl);
	corners=new Float32Array(3*3);
	corners[0]=0;
	corners[1]=0;
	corners[2]=0;
	corners[3]=1;
	corners[4]=0;
	corners[5]=0;
	corners[6]=0;
	corners[7]=1;
	corners[8]=0;
	obj.setCorners(corners);
	this.basis=obj;
	
	obj=new webGLshape(this.gl);
	obj.setXYZ([0,0,0,1,0,0]);
	obj.setLIN([0,1]);
	obj.setUV([1/8+1/16,7.9/8,1/8+1/16,7.9/8]);
	this.line_x=obj;
	
	this.p1=[0,0];
	this.p2=[0,0];
	this.p3=[0,0];
	this.p1_pixels=[0,0];
	this.p2_pixels=[0,0];
	this.p3_pixels=[0,0];
	this.line_state=0;//0: no line, click to define point 1, 1: point 1 defined, mouse up to define point 2, 2: point 2 defined, click to define point 3, 3: point 3 defined, mouse up to finalize, 4: point 3 finalized, click to define point 1.
	this.angle=0;
 }
 
 DEAcaliber.prototype.setVisible=function(flag)
 {
	this.visible=flag;
	if(this.visible) 
	{
		this.enabled=true;
		this.gui_animation=1;
		this.lastTimeAction = new Date().getTime();
	}
 }
 
 DEAcaliber.prototype.setEnabled=function(flag)
 {
	this.enabled=flag;
 }
 
 //rotate x-unit vector to the given line segment
 DEAcaliber.prototype.line=function(p1,p2)
 {
  mat4.translate(this.mvMatrix,[p1[0], p1[1], 0],this.local_mvMatrix);
  mat4.rotate(this.local_mvMatrix,Math.atan2(p2[1]-p1[1], p2[0]-p1[0]),[0,0,1]);
  var d=Math.sqrt((p1[0]-p2[0])*(p1[0]-p2[0])+(p1[1]-p2[1])*(p1[1]-p2[1]));
  mat4.scale(this.local_mvMatrix,[d,d,d]);
  this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.local_mvMatrix);
  this.line_x.draw(this.shaderProgram);
 }
 
 DEAcaliber.prototype.draw=function(pMatrix, mvMatrix)
 {
	if(!this.visible) return;
	
	var timeNow = new Date().getTime();
	var showGUI = false;
	if (this.lastTimeAction != 0) 
	{
        var elapsed = timeNow - this.lastTimeAction;
	    var elapsedFPS = timeNow - this.lastTimeDraw;
	    if(elapsed<4000)
	    {
			showGUI=true;
			//if(this.gui_animation<1) draw_now=true;
			this.gui_animation+=0.004*elapsedFPS;
			if(this.gui_animation>1) this.gui_animation=1.0;
		}
	    else
	    { 
			//if(gui_animation>0) draw_now=true;
			this.gui_animation-=0.004*elapsedFPS;
			if(this.gui_animation<0) this.gui_animation=0.0;
	    }
    }
	this.lastTimeDraw=timeNow;
	
	var gl=this.gl;
	gl.useProgram(this.shaderProgram);	
	
	this.pMatrix=pMatrix;
	this.mvMatrix=mvMatrix;
	
	if(this.line_state!=0)
	{
		this.gl.uniform4f(this.shaderProgram.uColorMask,1,0,0,1);
		this.line(this.p1,this.p2);
		if(this.line_state>2)
			this.line(this.p2,this.p3);
	}
	
	mat4.translate(mvMatrix,[this.xTra, this.yTra, 0], this.local_mvMatrix);
	mat4.rotate(this.local_mvMatrix, this.rot, [0, 0, 1]);
	gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.local_mvMatrix);
	
	if(this.enabled) 
		this.gl.uniform4f(this.shaderProgram.uColorMask,1,1,1,1);
	else
		this.gl.uniform4f(this.shaderProgram.uColorMask,1,1,1,0.4);
	
	mat4.rotate(this.local_mvMatrix, this.hRot, [0, 0, 1]);
	gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.local_mvMatrix);
	this.h_ruler.draw(this.shaderProgram);
	mat4.rotate(this.local_mvMatrix, this.vRot-this.hRot, [0, 0, 1]);
	gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.local_mvMatrix);
	this.v_ruler.draw(this.shaderProgram);
	if(this.enabled) 
	{
		this.gl.uniform4f(this.shaderProgram.uColorMask,1,1,1,this.gui_animation);
		this.v_cycle.draw(this.shaderProgram);
		mat4.rotate(this.local_mvMatrix, this.hRot-this.vRot, [0, 0, 1]);
	    gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.local_mvMatrix);
		this.h_cycle.draw(this.shaderProgram);
		this.cycle.draw(this.shaderProgram);
		
		this.messages.drawString(""+Math.round((this.vRot-this.hRot)*180/Math.PI+90),[0,0,0],[0.4/this.cm_height,0.4/this.cm_height,1],this.shaderProgram,this.local_mvMatrix);
	}
	
	if(this.enabled)
	{
	this.plots[0].draw();
	this.plots[1].draw();
	this.plots[1].drawCaption("  Angle: "+this.angle+" deg  ");
	}
}
 
 DEAcaliber.prototype.projectCorners=function()
 {
   var modelViewPerspMatrix = mat4.create();
   mat4.multiply(this.pMatrix, this.mvMatrix, modelViewPerspMatrix);
   mat4.translate(modelViewPerspMatrix,[this.xTra, this.yTra, 0]);
   mat4.rotate(modelViewPerspMatrix,this.rot,[0, 0, 1]);
   mat4.rotate(modelViewPerspMatrix, this.hRot, [0, 0, 1]);
   this.h_ruler.projectCorners(modelViewPerspMatrix,this.gl.viewportWidth,this.gl.viewportHeight);
   mat4.rotate(modelViewPerspMatrix, this.vRot-this.hRot, [0, 0, 1]);
   this.v_ruler.projectCorners(modelViewPerspMatrix,this.gl.viewportWidth,this.gl.viewportHeight);
   this.v_cycle.projectCorners(modelViewPerspMatrix,this.gl.viewportWidth,this.gl.viewportHeight);
   mat4.rotate(modelViewPerspMatrix, this.hRot-this.vRot, [0, 0, 1]);
   this.h_cycle.projectCorners(modelViewPerspMatrix,this.gl.viewportWidth,this.gl.viewportHeight);
   this.basis.projectCorners(modelViewPerspMatrix,this.gl.viewportWidth,this.gl.viewportHeight);
 }

 
 DEAcaliber.prototype.handleMouseMove=function(x,y,dx,dy,zoom)
 {
	if(!this.visible || !this.enabled) return;
 
	if(this.interacting_with_object==0)
	{
		this.lastTimeAction = new Date().getTime();
		
		if(this.line_state==1)
		{
			this.p2=this.heightmap.getPixelInSpace(x,y);
			this.p2_pixels=this.heightmap.getPixelLocation(x,y);
		}
		else if(this.line_state==3)
		{
			this.p3=this.heightmap.getPixelInSpace(x,y);
			this.p3_pixels=this.heightmap.getPixelLocation(x,y);
		}
		//log(a[0]+" "+a[1]);
	}
	else if(this.interacting_with_object==1)
	{
		this.xTra+=2.0*dx/zoom;
		this.yTra-=2.0*dy/zoom;
	}
	else if(this.interacting_with_object==2)
	{
		this.rot-=4.0*dy;
		this.rot-=4.0*dx;
	}
	else if(this.interacting_with_object==3)
	{
		this.hRot-=4.0*dy;
		this.hRot-=4.0*dx;
		
		if(this.hRot-this.vRot>Math.PI/2)
			this.hRot=this.vRot+Math.PI/2;
		else if(this.hRot-this.vRot<-Math.PI/2)
			this.hRot=this.vRot-Math.PI/2;
	}
	else if(this.interacting_with_object==4)
	{
		this.vRot-=4.0*dy;
		this.vRot-=4.0*dx;
		
		if(this.vRot-this.hRot>Math.PI/2)
			this.vRot=this.hRot+Math.PI/2;
		else if(this.vRot-this.hRot<-Math.PI/2)
			this.vRot=this.hRot-Math.PI/2;
	}
	else if(this.interacting_with_object==5)
	{
		this.plots[0].handleMouseMove(dx,dy);
	}
	else if(this.interacting_with_object==6)
	{
		this.plots[1].handleMouseMove(dx,dy);
	}
 }
 
 DEAcaliber.prototype.handleMouseDown=function(x,y)
 {
	if(!this.visible || !this.enabled) return;
 
	this.projectCorners();
	
	var a=this.basis.onPlane(x,y);
	if(this.plots[0].onPlot(x,y))
	{
		this.interacting_with_object=5;
	}
	else if(this.plots[1].onPlot(x,y))
	{
		this.interacting_with_object=6;
	}
	else if(a[0]*a[0]+a[1]*a[1]<(0.8*0.8)/(this.cm_height*this.cm_height))
	{
		this.interacting_with_object=2;
		this.lastTimeAction = new Date().getTime()-4000;
	}
	else if(this.h_cycle.insideConvex(x,y))
	{
		this.interacting_with_object=3;
		this.lastTimeAction = new Date().getTime()-4000;
	}
	else if(this.v_cycle.insideConvex(x,y))
	{
		this.interacting_with_object=4;
		this.lastTimeAction = new Date().getTime()-4000;
	}
	else if(this.h_ruler.insideConvex(x,y))
	{
		this.interacting_with_object=1;
		this.lastTimeAction = new Date().getTime()-4000;
	}
	else if(this.v_ruler.insideConvex(x,y))
	{
		this.interacting_with_object=1;
		this.lastTimeAction = new Date().getTime()-4000;
	}
	else
	{
		this.interacting_with_object=0;
		if(this.line_state==0 || this.line_state==4)
		{
			this.p1=this.heightmap.getPixelInSpace(x,y);
			this.p1_pixels=this.heightmap.getPixelLocation(x,y);
			this.p2=this.p1;
			this.line_state=1;
			this.plots[0].setVisible(false);
			this.plots[1].setVisible(false);
			this.plots[0].rotX=0;
			this.plots[0].rotY=0;
			this.plots[1].rotX=0;
			this.plots[1].rotY=0;
			
		}
		else if(this.line_state==2)
		{
			this.p3=this.heightmap.getPixelInSpace(x,y);
			this.p3_pixels=this.heightmap.getPixelLocation(x,y);
			this.line_state=3;
		}
	}
}
 
 DEAcaliber.prototype.handleMouseUp=function(x,y)
 {
	if(this.interacting_with_object>0)
	{
		this.lastTimeAction = new Date().getTime();
		this.interacting_with_object=0;
	}
	else if(this.interacting_with_object==0)
	{
		if(this.line_state==1)
		{
			
			//THE FOLLOWING LINES WERE REMOVED BECAUSE x,y MAY BE NULL IN CASE OF TOUCH END
			//this.p2=this.heightmap.getPixelInSpace(x,y);
			//this.p2_pixels=this.heightmap.getPixelLocation(x,y);
			this.line_state=2;
			this.plots[0].setData(this.heightmap.getData(this.p1_pixels,this.p2_pixels,15),15,this.heightmap.hmData.height/this.cm_height);
			this.plots[0].setVisible(true);
		}
		else if(this.line_state==3)
		{
			
			//THE FOLLOWING LINES WERE REMOVED BECAUSE x,y MAY BE NULL IN CASE OF TOUCH END	
			//this.p3=this.heightmap.getPixelInSpace(x,y);
			//this.p3_pixels=this.heightmap.getPixelLocation(x,y);
			this.line_state=4;
			this.plots[1].setData(this.heightmap.getData(this.p2_pixels,this.p3_pixels,15),15,this.heightmap.hmData.height/this.cm_height);
			this.angle=(Math.atan2(this.p1[1]-this.p2[1],this.p1[0]-this.p2[0])-Math.atan2(this.p3[1]-this.p2[1],this.p3[0]-this.p2[0]))*180/Math.PI;
			this.angle=Math.abs(Math.round(this.angle*100)/100);
			this.plots[1].setVisible(true);
		}
	}
 }
 
 DEAcaliber.prototype.handleMouseOut=function(x,y)
 {
	if(this.interacting_with_object>0)
		this.lastTimeAction = new Date().getTime();
	
	this.interacting_with_object=0;
 }
 
 function DEAbeams(toolbox)
 {
	this.gl=toolbox.gl_canvas.gl;
	this.camera=toolbox.camera;
	
	this.mvMatrix = mat4.create();
	mat4.identity(this.mvMatrix);
	this.pMatrix = mat4.create();
	mat4.perspective(45, this.gl.viewportWidth/this.gl.viewportHeight, 0.1, 100.0, this.pMatrix);
	
	this.shaderProgram=createGUIShaders(this.gl);
	this.gl.uniform4f(this.shaderProgram.uColorMask,1,1,0,1);
	this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
	this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
	
	this.obj=new webGLshape(this.gl);
	var xyz=new Float32Array(11*11*3*2);
	var uv=new Float32Array(11*11*2*2);
	var tri=new Uint16Array(11*11*2);
	var idx=0;
	var idx2=0;
	var idx3=0;
	for(var i=-5;i<=5;i++)
	{
		for(var j=-5;j<=5;j++)
		{
			
			xyz[idx]=i*0.4;
			xyz[idx+1]=j*0.4;
			xyz[idx+2]=-1;
			idx+=3;
			xyz[idx]=i*0.4;
			xyz[idx+1]=j*0.4;
			xyz[idx+2]=1;
			idx+=3;
			tri[idx2]=idx2;
			idx2+=1;
			tri[idx2]=idx2;
			idx2+=1;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.1/8;
			idx3+=2;
			uv[idx3]=1/8+1/16;
			uv[idx3+1]=7.9/8;
			idx3+=2;
		}
	}
	this.obj.setXYZ(xyz);
	this.obj.setLIN(tri);
	this.obj.setUV(uv);
 }
  
  DEAbeams.prototype.draw=function()
 {
	var gl=this.gl;
	gl.useProgram(this.shaderProgram);	
	mat4.identity(this.mvMatrix);
	mat4.translate(this.mvMatrix, [0.0, 0.0, -2]);
	mat4.rotate(this.mvMatrix, this.camera.yRot* Math.PI / 180, [0, 1, 0]);
	mat4.rotate(this.mvMatrix, this.camera.xRot* Math.PI / 180, [1, 0, 0]);
	
	mat4.rotate(this.mvMatrix, this.camera.xLig, [-1, 0, 0]);
    mat4.rotate(this.mvMatrix, this.camera.yLig, [0, 1, 0]);
	gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
	this.obj.draw(this.shaderProgram);
 }
 
 function DEAloadingLine(gl_canvas)
 {
	this.max_value=100;
	this.value=0;
	this.gl=gl_canvas.gl;
	
	this.mvMatrix = mat4.create();
	mat4.identity(this.mvMatrix);
	this.pMatrix = mat4.create();
	this.width=5;
	
	var fovX=45*Math.PI/180;
	var d = (this.gl.viewportWidth * 0.5) / Math.tan(fovX * 0.5);
	var fovY = 2 * 180/Math.PI * Math.atan((this.width * 0.5) / d);
	mat4.perspective(fovY, this.gl.viewportWidth/this.width, 0.1, 100.0, this.pMatrix);
	
	
	this.shaderProgram=createGUIShaders(this.gl);
	this.gl.uniform4f(this.shaderProgram.uColorMask,0.3,0.3,1,1);
	this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
	this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
				
	this.obj=new webGLshape(this.gl);
	this.obj.setXYZ([1.0, -1.0,  -2.42, 1.0, 1.0,  -2.42, -1.0,  1.0,  -2.42, -1.0,  -1.0,  -2.42]);
	this.obj.setTRI([0, 1, 2, 0, 2, 3]);
	this.obj.setUV([1/8, 8/8, 2/8, 8/8, 2/8, 7.85/8, 1/8, 7.85/8]);
 }
 
 DEAloadingLine.prototype.draw=function()
 {
	if(this.value==0)return;
 
	var gl=this.gl;
	gl.useProgram(this.shaderProgram);	
	gl.viewport(0, gl.viewportHeight-this.width, gl.viewportWidth, this.width);
	mat4.identity(this.mvMatrix);
	mat4.translate(this.mvMatrix, [-2+2*this.value/this.max_value, 0.0, 0.0]);
	this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
	this.obj.draw(this.shaderProgram);
 }
 
 function DEAloading(gl_canvas)
 {
	this.gl=gl_canvas.gl;
	this.obj=new webGLshape(this.gl);
	var r1=0.3;
       var r2=0.2;
	var num_of_tr=8;
	var xyzl=new Float32Array(num_of_tr*12);
	var nl=new Float32Array(num_of_tr*12);
	var tril=new Uint16Array(num_of_tr*6);
	
	for(var i1=0;i1<num_of_tr;i1+=1)
	{
		xyzl[i1*12+0]=Math.cos(i1*2*3.1416/num_of_tr)*r1;
		xyzl[i1*12+1]=Math.sin(i1*2*3.1416/num_of_tr)*r1;
		xyzl[i1*12+2]=-2;
		xyzl[i1*12+3]=Math.cos((i1+0.5)*2*3.1416/num_of_tr)*r1;
		xyzl[i1*12+4]=Math.sin((i1+0.5)*2*3.1416/num_of_tr)*r1;
		xyzl[i1*12+5]=-2;
		xyzl[i1*12+6]=Math.cos(i1*2*3.1416/num_of_tr)*r2;
		xyzl[i1*12+7]=Math.sin(i1*2*3.1416/num_of_tr)*r2;
		xyzl[i1*12+8]=-2;
		xyzl[i1*12+9]=Math.cos((i1+0.5)*2*3.1416/num_of_tr)*r2;
		xyzl[i1*12+10]=Math.sin((i1+0.5)*2*3.1416/num_of_tr)*r2;
		xyzl[i1*12+11]=-2;
		nl[i1*12+0]=0;
		nl[i1*12+1]=0;
		nl[i1*12+2]=1;
		nl[i1*12+3]=0;
		nl[i1*12+4]=0;
		nl[i1*12+5]=1;
		nl[i1*12+6]=1;
		nl[i1*12+7]=0;
		nl[i1*12+8]=0;
		nl[i1*12+9]=-1;
		nl[i1*12+10]=0;
		nl[i1*12+11]=0;
		tril[i1*6+0]=i1*4;
		tril[i1*6+1]=i1*4+1;
		tril[i1*6+2]=i1*4+2;
		tril[i1*6+3]=i1*4+2;
		tril[i1*6+4]=i1*4+3;
		tril[i1*6+5]=i1*4+1;
	}
	
	this.obj.setXYZ(xyzl);
	this.obj.setTRI(tril);
	this.obj.setNormals(nl);
	
	this.mvMatrix = mat4.create();
	mat4.identity(this.mvMatrix);

	this.pMatrix = mat4.create();
	mat4.perspective(45, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0, this.pMatrix);
	
	this.shaderProgram=this.createShaders();
	this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
	this.gl.uniform3f(this.shaderProgram.ambientColorUniform,0.1,0.1,0.1);
	
	var xLig = 0.6;
    var yLig = -0.3;
    var lightingDirection = [Math.sin(yLig)*Math.cos(xLig), Math.sin(xLig), Math.cos(yLig)*Math.cos(xLig) ];
          
	this.gl.uniform3fv(this.shaderProgram.lightingDirectionUniform, lightingDirection);
    this.gl.uniform3f(this.shaderProgram.directionalColorUniform,0.9,0.9,0.9);
	this.gl.uniform1i(this.shaderProgram.samplerUniform, 0);
}
 
 DEAloading.prototype.draw=function()
 {
	var gl=this.gl;
	gl.useProgram(this.shaderProgram);	
	mat4.rotate(this.mvMatrix, 0.08, [0, 0, -1]);
	this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
	this.obj.draw(this.shaderProgram);
 }
 
 DEAloading.prototype.createFragmentShader=function()
    {
		var gl=this.gl;
        var source="";
    	 source+="	precision mediump float;		";
	 source+="	varying vec3 vLightWeighting;	";

    	 source+="	void main(void) {			";
        source+="	gl_FragColor = vec4(vec3(1,1,1) * vLightWeighting, 1);	";
    	 source+="	}";
	
	 var shader = gl.createShader(gl.FRAGMENT_SHADER);
	 gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }
 
 DEAloading.prototype.createVertexShader=function()
    {
		var gl=this.gl;
        var source="";
    	 source+="	attribute vec3 aVertexPosition;		";
		 source+="	attribute vec3 aVertexNormal;		";
		 source+="	uniform mat4 uMVMatrix;			";
		 source+="	uniform mat4 uPMatrix;			";
		 source+="	uniform vec3 uAmbientColor;			";
		 source+="	uniform vec3 uLightingDirection;		";
    	 source+="	uniform vec3 uDirectionalColor;		";
		 source+="	varying vec3 vLightWeighting;		";

    	 source+="	void main(void) {	";
        source+="	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);	";
        source+="	float directionalLightWeighting = max(dot(aVertexNormal, uLightingDirection), 0.0);	";
        source+="	vLightWeighting = uAmbientColor + uDirectionalColor * directionalLightWeighting;	";
        source+="	}";
	
	 var shader = gl.createShader(gl.VERTEX_SHADER);
	 gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }
 
DEAloading.prototype.createShaders=function() {
		var gl=this.gl;
        var fragmentShader = this.createFragmentShader();
        var vertexShader = this.createVertexShader();

        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert("Could not initialise shaders");
        }

        gl.useProgram(shaderProgram);

        shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

        shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
        gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

		shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
        gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
		
        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
        shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
        shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
        shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
        shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
        shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");
		
	 return shaderProgram;
    }
 
 function DEAmessage(gl_canvas,num_of_rows,size_of_row)
 {
	this.gl=gl_canvas.gl;
	this.messages=new Array();
	this.symbols=new Array();
	this.mvMatrix = mat4.create();
	mat4.identity(this.mvMatrix);
	this.pMatrix = mat4.create();
	this.num_of_rows=num_of_rows;
	this.size_of_row=size_of_row;
	
	mat4.perspective(2*Math.atan(Math.tan(22.5*Math.PI/180)*this.num_of_rows)*180/Math.PI, this.gl.viewportWidth/(this.size_of_row*this.num_of_rows), 0.1, 100.0, this.pMatrix);
	
	this.rows=new Array(this.num_of_rows);
	this.time=new Array(this.num_of_rows);
	for(var i=0;i<this.num_of_rows;i++)
	{
		this.rows[i]=null;
		this.time[i]=0;
	}
	this.lastTimeDraw=0;
	this.uv_height=19/512;
	this.uv_width=new Array(255);
	this.v_base=new Array(255);
	this.u_base=new Array(255);
	this.uv_width[10]=0;//new line
	this.uv_width[32]=7;//space
	this.uv_width[44]=3;//,
	this.uv_width[46]=3;//.
	this.uv_width[48]=11;//0
	this.uv_width[49]=5;//1
	this.uv_width[50]=11;//2
	this.uv_width[51]=11;//3
	this.uv_width[52]=11;//4
	this.uv_width[53]=11;//5
	this.uv_width[54]=11;//6
	this.uv_width[55]=11;//7
	this.uv_width[56]=11;//8
	this.uv_width[57]=11;//9
	this.uv_width[58]=3;//:
	this.uv_width[65]=10;//A
	this.uv_width[66]=11;//B
	this.uv_width[67]=11;//C
	this.uv_width[68]=11;//D
	this.uv_width[69]=11;//E
	this.uv_width[70]=11;//F
	this.uv_width[71]=11;//G
	this.uv_width[72]=11;//H
	this.uv_width[73]=3;//I
	this.uv_width[74]=9;//J
	this.uv_width[75]=11;//K
	this.uv_width[76]=9;//L
	this.uv_width[77]=14;//M
	this.uv_width[78]=14;//N
	this.uv_width[79]=11;//O
	this.uv_width[80]=11;//P
	this.uv_width[81]=11;//Q
	this.uv_width[82]=11;//R
	this.uv_width[83]=11;//S
	this.uv_width[84]=11;//T
	this.uv_width[85]=11;//U
	this.uv_width[86]=11;//V
	this.uv_width[87]=15;//W
	this.uv_width[88]=11;//X
	this.uv_width[89]=11;//Y
	this.uv_width[90]=11;//Z
	this.uv_width[97]=11;//a
	this.uv_width[98]=11;//b
	this.uv_width[99]=11;//c
	this.uv_width[100]=11;//d
	this.uv_width[101]=10;//e
	this.uv_width[102]=9;//f
	this.uv_width[103]=11;//g
	this.uv_width[104]=11;//h
	this.uv_width[105]=3;//i
	this.uv_width[106]=5;//j
	this.uv_width[107]=11;//k
	this.uv_width[108]=3;//l
	this.uv_width[109]=15;//m
	this.uv_width[110]=11;//n
	this.uv_width[111]=11;//o
	this.uv_width[112]=11;//p
	this.uv_width[113]=11;//q
	this.uv_width[114]=9;//r
	this.uv_width[115]=11;//s
	this.uv_width[116]=9;//t
	this.uv_width[117]=11;//u
	this.uv_width[118]=11;//v
	this.uv_width[119]=15;//w
	this.uv_width[120]=11;//x
	this.uv_width[121]=11;//y
	this.uv_width[122]=11;//z
	var i=0;
	for(i=65;i<91;i++)//A-Z
	{
		this.uv_width[i]/=512;
		if(i<86)
			this.v_base[i]=44/512;
		else this.v_base[i]=25/512;
		
		if(i==65)
			this.u_base[i]=2/512;
		else if(i==86)
			this.u_base[i]=2/512;
		else	
			this.u_base[i]=this.u_base[i-1]+this.uv_width[i-1];
		this.uv_width[i]+=1/512;
	}
	i=32;//space
	this.uv_width[i]/=512;
	this.v_base[i]=25/512;		
	this.u_base[i]=this.u_base[90]+this.uv_width[90];
	this.uv_width[i]+=1/512;
	for(i=97;i<123;i++)//a-z
	{
		this.uv_width[i]/=512;
		if(i<113)
			this.v_base[i]=25/512;
		else this.v_base[i]=5/512;
		
		if(i==97)
			this.u_base[i]=this.u_base[32]+this.uv_width[32];
		else if(i==113)
			this.u_base[i]=2/512;
		else	
			this.u_base[i]=this.u_base[i-1]+this.uv_width[i-1];
		this.uv_width[i]+=1/512;
	}
	i=44;//,
	this.uv_width[i]/=512;
	this.v_base[i]=25/512;		
	this.u_base[i]=this.u_base[112]+this.uv_width[112];
	this.uv_width[i]+=1/512;
	i=46;//.
	this.uv_width[i]/=512;
	this.v_base[i]=5/512;		
	this.u_base[i]=this.u_base[122]+this.uv_width[122];
	this.uv_width[i]+=1/512;
	i=58;//:
	this.uv_width[i]/=512;
	this.v_base[i]=5/512;		
	this.u_base[i]=this.u_base[46]+this.uv_width[46];
	this.uv_width[i]+=1/512;
	for(i=48;i<58;i++)//0-9
	{
		this.uv_width[i]/=512;
		this.v_base[i]=5/512;
		
		if(i==48)
			this.u_base[i]=this.u_base[58]+this.uv_width[58];
		else	
			this.u_base[i]=this.u_base[i-1]+this.uv_width[i-1];
		this.uv_width[i]+=1/512;
	}
	
	this.createSymbols();
	
	this.shaderProgram=createGUIShaders(this.gl);
	this.gl.uniform4f(this.shaderProgram.uColorMask,1,1,1,1);
	this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
 }
 
 DEAmessage.prototype.drawString=function(txt,t,s,shaderProgram,local_mvMatrix)
 {
	var mvMatrix=mat4.create();
	mat4.identity(mvMatrix);
	var total_width=0;
	for(var k=0;k<txt.length;k++)
			total_width+=this.uv_width[txt.charCodeAt(k)];
	var base=-total_width*40/2;
	if(typeof local_mvMatrix !== 'undefined')
		mat4.translate(local_mvMatrix,t,mvMatrix);
	else mat4.translate(mvMatrix,t);
	
	mat4.scale(mvMatrix,s);
	mat4.translate(mvMatrix,[base,0,0]);
	for(var i=0;i<txt.length;i++)
	{
		cid=txt.charCodeAt(i);
		this.gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
		this.symbols[cid].draw(shaderProgram);
		mat4.translate(mvMatrix,[this.uv_width[cid]*40,0,0]);
	}
 }
 
 DEAmessage.prototype.createSymbols=function()
 {
	for(var cid=0;cid<255;cid++)
	{
		this.symbols[cid]=new webGLshape(this.gl);
		var xyz=new Float32Array(3*4);
		var j=0;
		xyz[j]=this.uv_width[cid]*40;
		xyz[j+1]=1;
		xyz[j+2]=0;
		j+=3;
		xyz[j]=0;
		xyz[j+1]=1;
		xyz[j+2]=0;
		j+=3;
		xyz[j]=0;
		xyz[j+1]=-1;
		xyz[j+2]=0;
		j+=3;
		xyz[j]=this.uv_width[cid]*40;
		xyz[j+1]=-1;
		xyz[j+2]=0;
		j+=3;
		this.symbols[cid].setXYZ(xyz);
		this.symbols[cid].setTRI([0,1,2,0,2,3]);
		var uv=new Float32Array(4*2);
		j=0;
		uv[j]=this.u_base[cid]+this.uv_width[cid];
		uv[j+1]=this.v_base[cid]+this.uv_height;
		j+=2;
		uv[j]=this.u_base[cid];
		uv[j+1]=this.v_base[cid]+this.uv_height;
		j+=2;
		uv[j]=this.u_base[cid];
		uv[j+1]=this.v_base[cid];
		j+=2;
		uv[j]=this.u_base[cid]+this.uv_width[cid];
		uv[j+1]=this.v_base[cid];
		j+=2;
		this.symbols[cid].setUV(uv);
	}
 }
 
 DEAmessage.prototype.addString=function(txt)
 {
	var obj=new webGLshape(this.gl);
	
	var xyz=new Float32Array(3*4*txt.length);
	var j=0;
	var base=0;
	var cid=0;
	var line_now=-1;
	for(var i=0;i<txt.length;i++)
	{
		if(i==0 || cid==10)
		{
			var total_width=0;
			for(var k=i;k<txt.length && txt.charCodeAt(k)!=10;k++)
				total_width+=this.uv_width[txt.charCodeAt(k)];
			base=-total_width*40/2;
			line_now+=1;
		}
		cid=txt.charCodeAt(i);
		
		xyz[j]=base+this.uv_width[cid]*40;
		xyz[j+1]=1-2*line_now;
		xyz[j+2]=-2.5;
		j+=3;
		xyz[j]=base;
		xyz[j+1]=1-2*line_now;
		xyz[j+2]=-2.5;
		j+=3;
		xyz[j]=base;
		xyz[j+1]=-1-2*line_now;
		xyz[j+2]=-2.5;
		j+=3;
		xyz[j]=base+this.uv_width[cid]*40;
		xyz[j+1]=-1-2*line_now;
		xyz[j+2]=-2.5;
		j+=3;
		base+=this.uv_width[cid]*40;
	}
	obj.setXYZ(xyz);
	
	var tri=new Uint16Array(6*txt.length);
	j=0;
	for(var i=0;i<txt.length;i++)
	{
		tri[j]=i*4;
		tri[j+1]=1+tri[j];
		tri[j+2]=2+tri[j];
		tri[j+3]=0+tri[j];
		tri[j+4]=2+tri[j];
		tri[j+5]=3+tri[j];
		j+=6;
	}
	obj.setTRI(tri);
	
	var uv=new Float32Array(4*2*txt.length);
	j=0;
	var cid=0;
	for(var i=0;i<txt.length;i++)
	{
		cid=txt.charCodeAt(i);
		uv[j]=this.u_base[cid]+this.uv_width[cid];
		uv[j+1]=this.v_base[cid]+this.uv_height;
		j+=2;
		uv[j]=this.u_base[cid];
		uv[j+1]=this.v_base[cid]+this.uv_height;
		j+=2;
		uv[j]=this.u_base[cid];
		uv[j+1]=this.v_base[cid];
		j+=2;
		uv[j]=this.u_base[cid]+this.uv_width[cid];
		uv[j+1]=this.v_base[cid];
		j+=2;
	}
	obj.setUV(uv);
	
	var id=this.messages.length;
	this.messages[id]=obj;
	return id;
 }
 
 DEAmessage.prototype.showMessage=function(string_id,row_id)
 {
	this.rows[row_id]=this.messages[string_id];
	this.time[row_id]=4000;
 }
 
 DEAmessage.prototype.fade=function(row_id)
 {
	this.time[row_id]=1000;
 }
 
 DEAmessage.prototype.draw=function()
 {
    var gl=this.gl;
	var timeNow = new Date().getTime();
	gl.useProgram(this.shaderProgram);	
	gl.viewport(0, gl.viewportHeight-this.size_of_row*this.num_of_rows, gl.viewportWidth, this.size_of_row*this.num_of_rows);
	for(var i=0;i<this.num_of_rows;i++)
	{
		if(this.rows[i]!=null)
		{
			if(this.time[i]>0)
			{
				this.time[i]-=(timeNow - this.lastTimeDraw);
				mat4.identity(this.mvMatrix);
				mat4.translate(this.mvMatrix,[0.0, this.num_of_rows-1-2.0*i, 0.0]);
				gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
				if(this.time[i]>3700)
					this.gl.uniform4f(this.shaderProgram.uColorMask,1,1,1,(4000-this.time[i])/300);
				else if(this.time[i]<1000)
					this.gl.uniform4f(this.shaderProgram.uColorMask,1,1,1,this.time[i]/1000);
				else
					this.gl.uniform4f(this.shaderProgram.uColorMask,1,1,1,1);
				this.rows[i].draw(this.shaderProgram);
			}
			else this.rows[i]=null;
		}
	}
	this.lastTimeDraw=timeNow;
 }
 
 DEAmessage.prototype.clear=function()
 {
	for(var i=0;i<this.num_of_rows;i++)
		this.rows[i]=null;
 }
 
 function DEAbutton(gl_canvas,button_id,num_of_buttons,num_of_rows,orientation,u,v,w,h,row,dx)
 {
	if(typeof row !== 'undefined')
		this.row=row;
	else this.row=0;
	
	var dx2=0.4;
	if(typeof dx !== 'undefined')
		dx2=dx;
	
	this.parent=null;
	this.message_display=null;
	
	this.type=0;//0:toggle button; 1:link; 2:menu
	this.status=false;
	this.enabled=true;
	this.overElement=false;
	
	this.gl_canvas=gl_canvas;
	this.gl=gl_canvas.gl;
	this.button_id=button_id;
	this.num_of_buttons=num_of_buttons;
	this.num_of_rows=num_of_rows;
	this.orientation=orientation;
	
	this.obj=new webGLshape(this.gl);
	this.link="";
	this.buttons=new Array();
	
	var md=(num_of_buttons+1)%2;
	var i=button_id-(num_of_buttons-num_of_buttons%2)/2;
	if(orientation==0)
		this.obj.setXYZ([-1.0+i*2-md+dx2, -1.0*num_of_rows+dx2+2*this.row,  -2.42, 1.0+i*2-md-dx2, -1.0*num_of_rows+dx2+2*this.row,  -2.42, 1.0+i*2-md-dx2,  -1.0*num_of_rows+2-dx2+2*this.row,  -2.42, -1.0+i*2-md+dx2,  -1.0*num_of_rows+2-dx2+2*this.row,  -2.42]);
	else if(orientation==1)
		this.obj.setXYZ([-1.0*num_of_rows+dx2+2*this.row, 1.0-i*2-md-dx2,  -2.42, -1.0*num_of_rows+dx2+2*this.row, -1.0-i*2-md+dx2,  -2.42,  -1.0*num_of_rows+2-dx2+2*this.row, -1.0-i*2-md+dx2, -2.42, -1.0*num_of_rows+2-dx2+2*this.row, 1.0-i*2-md-dx2, -2.42]);
	this.obj.setTRI([0, 1, 2, 0, 2, 3]);
	if(orientation==0)
		this.obj.setUV([u, v, u+w, v, u+w, v+h, u, v+h]);
	else
		this.obj.setUV([u, v+h, u, v, u+w, v, u+w, v+h]);
		
	if(this.row>0)
	{
		this.obj_option=new webGLshape(this.gl);
		if(orientation==0)
			this.obj_option.setXYZ([-1.0+i*2-md+dx2, -1.0*num_of_rows+dx2,  -2.42, 1.0+i*2-md-dx2, -1.0*num_of_rows+dx2,  -2.42, 1.0+i*2-md-dx2,  -1.0*num_of_rows+2-dx2,  -2.42, -1.0+i*2-md+dx2,  -1.0*num_of_rows+2-dx2,  -2.42]);
		else if(orientation==1)
			this.obj_option.setXYZ([-1.0*num_of_rows+dx2, 1.0-i*2-md-dx2,  -2.42, -1.0*num_of_rows+dx2, -1.0-i*2-md+dx2,  -2.42,  -1.0*num_of_rows+2-dx2, -1.0-i*2-md+dx2, -2.42, -1.0*num_of_rows+2-dx2, 1.0-i*2-md-dx2, -2.42]);
		this.obj_option.setTRI([0, 1, 2, 0, 2, 3]);
		if(orientation==0)
			this.obj_option.setUV([u, v, u+w, v, u+w, v+h, u, v+h]);
		else
			this.obj_option.setUV([u, v+h, u, v, u+w, v, u+w, v+h]);
	}
		
	this.shadow=new webGLshape(this.gl);
	dx2=0.15;
	if(orientation==0)
		this.shadow.setXYZ([-1.0+i*2-md+dx2, -1.0*num_of_rows+dx2+2*this.row,  -2.42, 1.0+i*2-md-dx2, -1.0*num_of_rows+dx2+2*this.row,  -2.42, 1.0+i*2-md-dx2,  -1.0*num_of_rows+2-dx2+2*this.row,  -2.42, -1.0+i*2-md+dx2,  -1.0*num_of_rows+2-dx2+2*this.row,  -2.42]);
	else if(orientation==1)
		this.shadow.setXYZ([-1.0*num_of_rows+dx2+2*this.row, 1.0-i*2-md-dx2,  -2.42, -1.0*num_of_rows+dx2+2*this.row, -1.0-i*2-md+dx2,  -2.42,  -1.0*num_of_rows+2-dx2+2*this.row, -1.0-i*2-md+dx2, -2.42, -1.0*num_of_rows+2-dx2+2*this.row, 1.0-i*2-md-dx2, -2.42]);
	this.shadow.setTRI([0, 1, 2, 0, 2, 3]);
	this.shadow.setUV([1/8, 8/8, 2/8, 8/8, 2/8, 7/8, 1/8, 7/8]);
	
	this.background=new webGLshape(this.gl);
	if(orientation==0)
		this.background.setXYZ([-1.0+i*2-md+dx2, -1.0*num_of_rows+dx2+2*this.row,  -2.42, 1.0+i*2-md-dx2, -1.0*num_of_rows+dx2+2*this.row,  -2.42, 1.0+i*2-md-dx2,  -1.0*num_of_rows+2-dx2+2*this.row,  -2.42, -1.0+i*2-md+dx2,  -1.0*num_of_rows+2-dx2+2*this.row,  -2.42]);
	else if(orientation==1)
		this.background.setXYZ([-1.0*num_of_rows+dx2+2*this.row, 1.0-i*2-md-dx2,  -2.42, -1.0*num_of_rows+dx2+2*this.row, -1.0-i*2-md+dx2,  -2.42,  -1.0*num_of_rows+2-dx2+2*this.row, -1.0-i*2-md+dx2, -2.42, -1.0*num_of_rows+2-dx2+2*this.row, 1.0-i*2-md-dx2, -2.42]);
	this.background.setTRI([0, 1, 2, 0, 2, 3]);
	this.background.setUV([1/8+2/512, 7/8+2/512, 2/8-2/512, 7/8+2/512, 2/8-2/512, 8/8-40/512, 1/8+2/512, 8/8-40/512]);
 }
 
 DEAbutton.prototype.setOverElement=function(flag)
 {
	if(!this.enabled) return;
	if(!this.overElement && flag)
	{
		if(this.message_display!=null)
		{
			this.message_display.clear();
			this.message_display.showMessage(this.message_id,1);
		}
	}
	else if(this.overElement && !flag)
	{
		if(this.message_display!=null)
			this.message_display.fade(1);
	}
	this.overElement=flag;
 }
 
 DEAbutton.prototype.setLink=function(link)
 {
	this.link=link;
	this.type=1;
 }
 
 DEAbutton.prototype.addOption=function(u,v,w,h,dx)
 {
	var ret=null;
	if(typeof dx !== 'undefined')
		ret=new DEAbutton(this.gl_canvas,this.button_id,this.num_of_buttons,this.num_of_rows,this.orientation,u,v,w,h,this.buttons.length+1,dx);
	else
		ret=new DEAbutton(this.gl_canvas,this.button_id,this.num_of_buttons,this.num_of_rows,this.orientation,u,v,w,h,this.buttons.length+1);
	this.buttons[this.buttons.length]=ret;
	this.type=2;
	return ret;
 }
 
 DEAbutton.prototype.clicked=function()
 {
	if(!this.enabled) return;
	
	if(this.type==0)
	{
		this.status=!this.status;
		this.onClick(this);
		if(this.parent!=null)this.parent.retractOptions();
	}
	else if(this.type==1)
	{
		if(this.parent!=null)this.parent.retractOptions();
		window.open(this.link);
	}
	else if(this.type==2)
	{
		this.status=!this.status;
		if(this.status==true)
		{
			this.parent.retractOptions();
			this.status=true;
			this.parent.extended_option_id=this.button_id;
		}
		else this.parent.retractOptions();
	}
 }
 
 DEAbutton.prototype.setMessage=function(string,message_display)
 {
	this.message_display=message_display;
	this.message_id=this.message_display.addString(string);
 }
 
 DEAbutton.prototype.onClick=function(button){}
 
 DEAbutton.prototype.drawShadow=function(shaderProgram)
 {
	if(this.enabled) 
	{
		this.shadow.draw(shaderProgram);
	}
 }
 
 DEAbutton.prototype.drawBackground=function(shaderProgram)
 {
	this.background.draw(shaderProgram);
 }
 
 DEAbutton.prototype.draw=function(shaderProgram)
 {
	if(this.type==0 && this.status==true)
	{
		this.gl.uniform4f(shaderProgram.uColorMask,0,0,1,1);
		this.shadow.draw(shaderProgram);
		this.gl.uniform4f(shaderProgram.uColorMask,1,1,1,1);
	}
	
	this.obj.draw(shaderProgram);
 }
 
 function DEAtoolbar(gl_canvas,num_of_rows,orientation,buttons,size_of_button)
 {
	this.size_of_button=size_of_button;//in pixels (implying square buttons)
    this.orientation=orientation;//0:horizontal; 1:vertical;
	this.lastTimeAction=(new Date().getTime())-2000;
    this.lastTimeDraw = 0;
	this.needs_draw=true;
    this.gui_animation=0;//0:hidden gui, 1:fully visible gui, in between values: gui animation
	this.mouse_pressed=false;
	this.overElement=-1;
	this.buttons=buttons;
	for(var i=0;i<this.buttons.length;i++)
		this.buttons[i].parent=this;
	this.num_of_rows=num_of_rows;
	this.extended_option_id=-1;
	this.overOption=-1;
 
	this.visible=true;
    this.canvas=gl_canvas.canvas;
	this.gl=gl_canvas.gl;
	this.mvMatrix = mat4.create();
	mat4.identity(this.mvMatrix);
	this.pMatrix = mat4.create();
	if(this.orientation==0)
	{
		//In this case fovY=45 (assuming num_of_rows=1) and fovX calculation is not necessary.
		mat4.perspective(2*Math.atan(Math.tan(22.5*Math.PI/180)*this.num_of_rows)*180/Math.PI, this.gl.viewportWidth/(this.size_of_button*this.num_of_rows), 0.1, 100.0, this.pMatrix);
	}
	else if(this.orientation==1)
	{
		//In this case fovX=45 (assuming num_of_rows=1) and fovY must be manually calculated and provided to mat4.perspective.
		var fovX=2*Math.atan(Math.tan(22.5*Math.PI/180)*this.num_of_rows);
		var d = (this.size_of_button*this.num_of_rows * 0.5) / Math.tan(fovX * 0.5);
		var fovY = 2 * 180/Math.PI * Math.atan((this.gl.viewportHeight * 0.5) / d);
		mat4.perspective(fovY, (this.size_of_button*this.num_of_rows)/this.gl.viewportHeight, 0.1, 100.0, this.pMatrix);
	}
	this.shaderProgram=createGUIShaders(this.gl);
	this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
    this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
	var num_of_buttons=this.buttons.length;
	//Background
	this.background=new webGLshape(this.gl);
	if(this.orientation==0)
		this.background.setXYZ([-1.0*num_of_buttons, -1.0*this.num_of_rows,  -2.42, 1.0*num_of_buttons, -1.0*this.num_of_rows,  -2.42, 1.0*num_of_buttons,  -1.0*this.num_of_rows+2,  -2.42, -1.0*num_of_buttons,  -1.0*this.num_of_rows+2,  -2.42]);
	else if(this.orientation==1)
		this.background.setXYZ([-1.0*this.num_of_rows, 1.0*num_of_buttons, -2.42, -1.0*this.num_of_rows, -1.0*num_of_buttons, -2.42, -1.0*this.num_of_rows+2, -1.0*num_of_buttons, -2.42, -1.0*this.num_of_rows+2, 1.0*num_of_buttons,  -2.42]);
	this.background.setTRI([0, 1, 2, 0, 2, 3]);
	this.background.setUV([1/8+2/512, 7/8+2/512, 2/8-2/512, 7/8+2/512, 2/8-2/512, 8/8-40/512, 1/8+2/512, 8/8-40/512]);

 }
 
 DEAtoolbar.prototype.setVisible=function(flag)
 {
	this.visible=flag;
 }
 
 DEAtoolbar.prototype.setUniformMatrices=function () 
 {
    this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
    this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
 }
  
 DEAtoolbar.prototype.retractOptions=function()
 {
	if(!this.visible) return;
	
	if(this.extended_option_id!=-1)
	{
		this.buttons[this.extended_option_id].status=false;
		this.setOverOption(-1);
		this.extended_option_id=-1;
	}
 }
 
 DEAtoolbar.prototype.draw=function()
 {
	if(!this.visible) return;
	var timeNow = new Date().getTime();
	var showGUI = false;
    if (this.lastTimeAction != 0) 
	{
        var elapsed = timeNow - this.lastTimeAction;
	    var elapsedFPS = timeNow - this.lastTimeDraw;
	    if(elapsed<4000)
	    {
			showGUI=true;
			if(this.gui_animation<1) this.needs_draw=true;
			this.gui_animation+=0.004*elapsedFPS;
			if(this.gui_animation>1) this.gui_animation=1.0;
		}
	    else
	    { 
			if(this.gui_animation>0) this.needs_draw=true;
			this.gui_animation-=0.004*elapsedFPS;
			if(this.gui_animation<0) this.gui_animation=0.0;
	    }
    }
	this.lastTimeDraw=timeNow;
 
	if(showGUI || this.gui_animation>0)
	{
	    var gl=this.gl;
		gl.useProgram(this.shaderProgram);
		
		//Set the viewport
		if(this.orientation==0)
			gl.viewport(0, 0, gl.viewportWidth, this.size_of_button*this.num_of_rows);
		else if(this.orientation==1)
			gl.viewport(0, 0, this.size_of_button*this.num_of_rows, gl.viewportHeight);
		
		//draw the background
		mat4.identity(this.mvMatrix);
		if(this.orientation==0)
			mat4.translate(this.mvMatrix, [0.0, -2.0+2.0*this.gui_animation, 0.0]);
		else if(this.orientation==1)
			mat4.translate(this.mvMatrix, [-2.0+2.0*this.gui_animation, 0.0, 0.0]);
		
		this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);	
		this.background.draw(this.shaderProgram);
		
		if(this.overElement>-1)
			this.buttons[this.overElement].drawShadow(this.shaderProgram);
		
		for(var i=0;i<this.buttons.length;i++)
			this.buttons[i].draw(this.shaderProgram);
		
		if(this.extended_option_id>-1)
		{
			for(var i=0;i<this.buttons[this.extended_option_id].buttons.length;i++)
			{
				this.buttons[this.extended_option_id].buttons[i].drawBackground(this.shaderProgram);
			}
		
			if(this.overOption>-1)
				this.buttons[this.extended_option_id].buttons[this.overOption].drawShadow(this.shaderProgram);
				
			for(var i=0;i<this.buttons[this.extended_option_id].buttons.length;i++)
			{
				this.buttons[this.extended_option_id].buttons[i].draw(this.shaderProgram);
			}
		}
	}
 }
 
 DEAtoolbar.prototype.setOverElement=function(id)
 {
	if(!this.visible) return;
	if(this.overElement!=id)
	{
		if(this.overElement!=-1)
			this.buttons[this.overElement].setOverElement(false);
		this.overElement=id;
		if(this.overElement!=-1)
			this.buttons[this.overElement].setOverElement(true);	
	}
 }
 
 DEAtoolbar.prototype.setOverOption=function(id)
 {
	if(!this.visible) return;
	if(this.overOption!=id)
	{
		if(this.overOption!=-1)
			this.buttons[this.extended_option_id].buttons[this.overOption].setOverElement(false);
		this.overOption=id;
		if(this.overOption!=-1)
			this.buttons[this.extended_option_id].buttons[this.overOption].setOverElement(true);
	}
 }
 
 DEAtoolbar.prototype.handleMouseMove=function(x,y)
 {
	if(!this.visible) return;
	if(this.mouse_pressed==false)
	{
		var mouseX = x;
       	var mouseY = y;
		var num_of_buttons=this.buttons.length;
		if(this.orientation==0)
		{
			if(mouseY>this.canvas.height-this.size_of_button+2 && mouseY<this.canvas.height-2)
			{
				var i=Math.floor((mouseX-this.gl.viewportWidth/2+this.size_of_button*num_of_buttons/2)/this.size_of_button);
				if(i<0 || i>=num_of_buttons) this.setOverElement(-1);
				else this.setOverElement(i);
			}
			else this.setOverElement(-1);
			
			if(this.extended_option_id>-1)
			{
				var i=Math.floor((mouseX-this.gl.viewportWidth/2+this.size_of_button*num_of_buttons/2)/this.size_of_button);
				if(i==this.extended_option_id)
				{
					i=Math.floor((this.canvas.height-mouseY)/this.size_of_button)-1;
					if(i<0 || i>=this.buttons[this.extended_option_id].buttons.length) this.setOverOption(-1);
					else this.setOverOption(i);
				}
				else this.setOverOption(-1);
			}
		}
		else if(this.orientation==1)
		{
			if(mouseX<this.size_of_button-2 && mouseX>2)
			{
				var i=Math.floor((mouseY-this.canvas.height/2+this.size_of_button*num_of_buttons/2)/this.size_of_button);
				if(i<0 || i>=num_of_buttons) this.setOverElement(-1);
				else this.setOverElement(i);
			}
			else this.setOverElement(-1);
			
			if(this.extended_option_id>-1)
			{
				var i=Math.floor((mouseY-this.canvas.height/2+this.size_of_button*num_of_buttons/2)/this.size_of_button);
				if(i==this.extended_option_id)
				{
					i=Math.floor((mouseX)/this.size_of_button)-1;
					if(i<0 || i>=this.buttons[this.extended_option_id].buttons.length) this.setOverOption(-1);
					else this.setOverOption(i);
				}
				else this.setOverOption(-1);
			}
		}
		
		this.lastTimeAction = new Date().getTime();
	}
 }
 
 DEAtoolbar.prototype.handleMouseUp=function(x,y)
 {
	if(!this.visible) return;
	this.mouse_pressed = false;
	this.lastTimeAction = new Date().getTime();
 }
 
 DEAtoolbar.prototype.handleMouseDown=function(x,y)
 {
	if(!this.visible) return 0;
	this.mouse_pressed = true;
	var action=0;
	if(this.overElement>-1)
	{
		this.mouse_pressed = false;
		this.buttons[this.overElement].clicked();
		action=1;
	}
	else if(this.extended_option_id>-1 && this.overOption>-1)
	{
		this.mouse_pressed = false;
		this.buttons[this.extended_option_id].buttons[this.overOption].clicked();
		action=1;
	}
	else
	{	
		this.retractOptions();
	}
	return action;
 }
 
 DEAtoolbar.prototype.retract=function()
 {
	if(this.lastTimeAction!=0) this.lastTimeAction-=4000;
 }
 
 DEAtoolbar.prototype.handleMouseOut=function(x,y)
 {
	if(!this.visible) return;
	this.retract();
	this.mouse_pressed = false;
 }
 
 function DEAtoolbox(url,canvas,options)
 {
	this.h_gui=null;
	this.v_gui=null;
	this.gl_canvas=new webGLcanvas(canvas);
	this.camera=null;
	this.bkg=null;
	this.bkgShaderProgram=null;
	this.messages=null;
	this.loading_obj=null;
	this.loading_line=null;
	this.beams=null;
	this.caliber=null;
	this.annotation=null;
	this.url=url;
	this.parseOptions(options);
	if(this.url.substr(this.url.length - 3).toUpperCase()=='XML')
		this.format='xml';
	else this.format='image'
	this.heightmap=null;
	this.object=null;
	this.dea_record=null;
	this.mouse_pressed=false;
	this.mouseX=0;
	this.mouseY=0;
	this.frame_now=0;
	this.draw_now=true;
	this.loading_progress_now=0;
	
	var self=this;
	this.gl_canvas.setup=function(){self.setup();};
	this.gl_canvas.draw=function(){self.draw();};
	this.gl_canvas.handleMouseMove=function(event){event.preventDefault();var x=new Array();var y=new Array();x[0]=event.clientX; y[0]=event.clientY; self.handleMouseMove(x,y);};
	this.gl_canvas.handleMouseUp=function(event){var x=new Array();var y=new Array();x[0]=event.clientX; y[0]=event.clientY;self.handleMouseUp(x,y);};
	this.gl_canvas.handleMouseDown=function(event){event.preventDefault();var x=new Array();var y=new Array();x[0]=event.clientX; y[0]=event.clientY;self.handleMouseDown(x,y);};
	this.gl_canvas.handleMouseOut=function(event){var x=new Array();var y=new Array();x[0]=event.clientX; y[0]=event.clientY;self.handleMouseOut(x,y);};
	this.gl_canvas.handleTouchStart=function(event){event.preventDefault();var x=new Array();var y=new Array();for(var i=0;i<event.targetTouches.length;i++){x[i]=event.targetTouches[i].clientX;y[i]=event.targetTouches[i].clientY;} self.handleMouseMove(x,y);self.handleMouseDown(x,y);};
	this.gl_canvas.handleTouchEnd=function(event){var x=new Array();var y=new Array();for(var i=0;i<event.targetTouches.length;i++){x[i]=event.targetTouches[i].clientX;y[i]=event.targetTouches[i].clientY;}self.handleMouseUp(x,y);};
	this.gl_canvas.handleTouchMove=function(event){event.preventDefault();var x=new Array();var y=new Array();for(var i=0;i<event.targetTouches.length;i++){x[i]=event.targetTouches[i].clientX;y[i]=event.targetTouches[i].clientY;}self.handleMouseMove(x,y);};
	
	this.gl_canvas.start();
 }
 
 DEAtoolbox.prototype.parseOptions=function(options)
 {
	this.fullscreen=true;
	this.simple_background=true;
	for(var i=0;i<options.length;i++)
	{
		if(options[i][0].toUpperCase()=='FULLSCREEN')
		{
			if(options[i][1].toUpperCase()=='TRUE')
				this.fullscreen=true;
			else if(options[i][1].toUpperCase()=='FALSE')
				this.fullscreen=false;
		}
		else if(options[i][0].toUpperCase()=='BACKGROUND')
		{
			if(options[i][1].toUpperCase()=='SIMPLE')
				this.simple_background=true;
			else if(options[i][1].toUpperCase()=='SPACE')
				this.simple_background=false;
		}
	}
 }
	
DEAtoolbox.prototype.setup=function()
	{
		var gl=this.gl_canvas.gl;
		var self=this;
		this.skin=new webGLtexture(gl,"viewer_gui-2.5.png");
		
		this.camera=new webGLcamera(this.gl_canvas);
		
		if(!this.simple_background) 
		{
			this.room=new webGLimageComposition(gl,"https://digitalepigraphy.github.io/legacy/db/spaces/museum");
			this.room.setBrightness(0.1);
		}
		else
		{
			this.bkg=new webGLshape(gl);
			this.bkg.setXYZ([-4.0, -1.2,  -2.5, 4.0, -1.2,  -2.5, 4.0,  1.2,  -2.5, -4.0,  1.2,  -2.5]);
			this.bkg.setTRI([0, 1, 2, 0, 2, 3]);
			this.bkg.setUV([1/8, 7/8, 2/8, 7/8, 2/8, 8/8, 1/8, 8/8]);
		
			this.bkgShaderProgram=createGUIShaders(gl);
			gl.uniform4f(this.bkgShaderProgram.uColorMask,0.7,0,0,1);
			var pMatrix = mat4.create();
			mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
			gl.uniformMatrix4fv(this.bkgShaderProgram.pMatrixUniform, false, pMatrix);
			var mvMatrix = mat4.create();mat4.identity(mvMatrix);
			gl.uniformMatrix4fv(this.bkgShaderProgram.mvMatrixUniform, false, mvMatrix);
		}
		
		
		this.messages=new DEAmessage(this.gl_canvas,5,19);
		
		//specify which fields you want to load
		dea_fields[0]=new DEAfield();
		dea_fields[0].setID(33);
		dea_fields[0].setName('DPI');
		dea_fields[1]=new DEAfield();
		dea_fields[1].setID(35);
		dea_fields[1].setName('Height');
		dea_fields[2]=new DEAfield();
		dea_fields[2].setID(49);
		dea_fields[2].setName('Depth Range');
		dea_fields[3]=new DEAfield();
		dea_fields[3].setID(36);
		dea_fields[3].setName('Polygons');
		dea_fields[4]=new DEAfield();
		dea_fields[4].setID(37);
		dea_fields[4].setName('Vertices');
		
		
		//load the xml of the object
		if(this.format=='xml')
		{
			var tokens=this.url.split("/");
			tokens.pop();
			tokens.pop();
			var path='';
			for(var i=0;i<tokens.length;i++)
				path=path+tokens[i]+'/';
			
			this.dea_record=new DEArecord(this.url);
			this.dea_record.load(false,true);
		
			var dpi=this.dea_record.getFieldValue(33);
			var height=this.dea_record.getFieldValue(35);
			var depth_range=this.dea_record.getFieldValue(49);
			var polys=this.dea_record.getFieldValue(36);
			
			if(polys.length!=0)
			{
				this.object=new DEAobject(this);
			}
			else
			{
				this.heightmap=new DEAheightmap(this);
				if(dpi.length!=0 && height.length!=0) this.heightmap.cm_height=2.54*parseFloat(height)/parseFloat(dpi);
				if(depth_range.length!=0) this.heightmap.depth_range=parseFloat(depth_range);
		
				this.heightmap.setImagePath(this.url.substring(0,this.url.length-8)+"Heightmap.png");
				this.caliber=new DEAcaliber(this.gl_canvas,this.heightmap,this.messages);
				this.annotation=new DEAannotation(this.gl_canvas,this.heightmap);
				
			for(var i=0;i<this.dea_record.record_links.length;i++)
			{
				if(this.dea_record.record_links[i].path=='images')
				{
					var light_dir=this.dea_record.record_links[i].getFieldValue(48).split(",");
					this.heightmap.setImagePath(this.dea_record.path+this.dea_record.id+"/"+this.dea_record.record_links[i].id,[parseFloat(light_dir[0]),parseFloat(light_dir[1]),parseFloat(light_dir[2])]);
				}
			}
			}
		}
		else
		{
			this.heightmap=new DEAheightmap(this);		
			this.heightmap.setImagePath(this.url);
			this.caliber=new DEAcaliber(this.gl_canvas,this.heightmap,this.messages);
			this.annotation=new DEAannotation(this.gl_canvas,this.heightmap);
		}
		
		this.loading_obj=new DEAloading(this.gl_canvas);
		this.loading_line=new DEAloadingLine(this.gl_canvas);
		this.beams=new DEAbeams(this);
		
		var num_of_rows=6;
	
		var dea_button=new DEAbutton(this.gl_canvas,0,7,num_of_rows,0, 0.0, 7/8, 1/8, 1/8,0,0.2);  
			dea_button.setLink("https://www.digitalepigraphy.org");
			dea_button.setMessage("  The Digital Epigraphy and Archaeology project  \n  www.digitalepigraphy.org  ",this.messages);
		this.dea_button=dea_button;
		
		var move_button=new DEAbutton(this.gl_canvas,1,7,num_of_rows,0, 2/8, 7/8, 1/8, 1/8);
			move_button.onClick=function(button)
			{
				move_button.status=false;
				rotate_button.status=false;
				zoom_button.status=false;
				relight_button.status=false;
				if(self.heightmap!=null)
				{
					self.annotation.setEnabled(false);
					self.caliber.setEnabled(false);
				}
				button.status=true;
			};
			move_button.setMessage("  Move object  ",this.messages);
		this.move_button=move_button;
		
		var rotate_button=new DEAbutton(this.gl_canvas,2,7,num_of_rows,0, 3/8, 7/8, 1/8, 1/8);
			rotate_button.status=true;
			rotate_button.onClick=move_button.onClick;
			rotate_button.setMessage("  Rotate object  ",this.messages);
		this.rotate_button=rotate_button;

		var zoom_button=new DEAbutton(this.gl_canvas,3,7,num_of_rows,0, 4/8, 7/8, 1/8, 1/8);
			zoom_button.onClick=move_button.onClick;
			zoom_button.setMessage("  Zoom in or out  ",this.messages);
		this.zoom_button=zoom_button;
		
		var relight_button=new DEAbutton(this.gl_canvas,4,7,num_of_rows,0, 6/8, 7/8, 1/8, 1/8);
			relight_button.onClick=move_button.onClick;
			relight_button.setMessage("  Change lighting direction  ",this.messages);
		this.relight_button=relight_button;
		
		var presets_button=new DEAbutton(this.gl_canvas,5,7,num_of_rows,0, 0/8, 4/8, 1/8, 1/8);
		presets_button.setMessage("  Change visualization mode  ",this.messages);
		if(this.heightmap==null)presets_button.enabled=false;
		var option1=presets_button.addOption(4/8, 4/8, 1/8, 1/8);
			option1.onClick=function(button)
			{
				presets_button.buttons[0].status=false;
				presets_button.buttons[1].status=false;
				presets_button.buttons[2].status=false;
				presets_button.buttons[3].status=false;
				presets_button.buttons[4].status=false;
				button.status=true;
				presets_button.obj=button.obj_option;
				presets_button.parent.retractOptions();
				
				if(presets_button.buttons[0].status)//original images
				{
					dimensions_button.buttons[1].onClick(dimensions_button.buttons[1]);
					texture_button.buttons[4].onClick(texture_button.buttons[4]);
				}
				else if(presets_button.buttons[1].status)//edge map
				{
					dimensions_button.buttons[0].onClick(dimensions_button.buttons[0]);
					texture_button.buttons[2].onClick(texture_button.buttons[2]);
					lights_button.status=false;
					self.heightmap.setLights(false);
				}
				else if(presets_button.buttons[2].status)//depth map
				{
					dimensions_button.buttons[0].onClick(dimensions_button.buttons[0]);
					texture_button.buttons[1].onClick(texture_button.buttons[1]);
					lights_button.status=false;
					self.heightmap.setLights(false);
				}
				else if(presets_button.buttons[3].status)//3D with depth map
				{
					dimensions_button.buttons[1].onClick(dimensions_button.buttons[1]);
					texture_button.buttons[1].onClick(texture_button.buttons[1]);
					lights_button.status=true;
					self.heightmap.setLights(true);
				}
				else if(presets_button.buttons[4].status)//3D model
				{
					dimensions_button.buttons[1].onClick(dimensions_button.buttons[1]);
					texture_button.buttons[0].onClick(texture_button.buttons[0]);
				}
			};
			option1.setMessage("  3D visualization of original images  ",this.messages);
			if(this.heightmap!=null && this.heightmap.images.length==1) option1.enabled=false;
		var	o=presets_button.addOption(3/8, 4/8, 1/8, 1/8);
			o.onClick=option1.onClick;
			o.setMessage("  2D edgemap visualization  ",this.messages);
		var	o=presets_button.addOption(2/8, 4/8, 1/8, 1/8);
			o.onClick=option1.onClick;
			o.setMessage("  2D depthmap visualization  ",this.messages);
		var	o=presets_button.addOption(1/8, 4/8, 1/8, 1/8);
			o.onClick=option1.onClick;
			o.setMessage("  3D visualization with depthmap  ",this.messages);
		var	o=presets_button.addOption(0/8, 4/8, 1/8, 1/8);
			o.onClick=option1.onClick;
			o.setMessage("  3D visualization  ",this.messages);
			o.status=true;
		this.presets_button=presets_button;
		
		var fullscreen_button=new DEAbutton(this.gl_canvas,6,7,num_of_rows,0, 5/8, 7/8, 1/8, 1/8);
		if(this.dea_record.path=="objects")
			fullscreen_button.setLink("viewfull.html?object="+this.dea_record.id);
		else fullscreen_button.setLink("viewfull.html?heightmap="+this.dea_record.id);
			fullscreen_button.setMessage("  Full screen and toolbox with more options ",this.messages);
			if(this.fullscreen) fullscreen_button.enabled=false;
		this.fullscreen_button=fullscreen_button;

		var buttons=new Array();
		buttons[0]=dea_button;
		buttons[1]=move_button;
		buttons[2]=rotate_button;
		buttons[3]=zoom_button;
		buttons[4]=relight_button;
		buttons[5]=presets_button;
		buttons[6]=fullscreen_button;
		this.h_gui=new DEAtoolbar(this.gl_canvas,num_of_rows,0,buttons,50);
		
		num_of_rows=6;
		var projection_button=new DEAbutton(this.gl_canvas,5,8,num_of_rows,1, 0.0, 6/8, 1/8, 1/8); 
		projection_button.setMessage("  Change projection mode  ",this.messages);
			option1=projection_button.addOption(0.0, 6/8, 1/8, 1/8);
			option1.onClick=function(button)
			{
				projection_button.buttons[0].status=false;
				projection_button.buttons[1].status=false;
				button.status=true;
				projection_button.obj=button.obj_option;
				projection_button.parent.retractOptions();
				
				if(projection_button.buttons[0].status==true)
					self.camera.perspectiveProjection();
				else if(projection_button.buttons[1].status==true)
					self.camera.orthographicProjection();
					
				ruler_button.status=false;
				roi_button.status=false;
				self.caliber.setVisible(false);
				self.annotation.setVisible(false);
			};
			option1.status=true;
			option1.setMessage("  Perspective projection  ",this.messages);
			o=projection_button.addOption(1/8, 6/8, 1/8, 1/8);
			o.onClick=option1.onClick;
			o.setMessage("  Orthographic projection  ",this.messages);
		this.projection_button=projection_button;
		
		var ruler_button=new DEAbutton(this.gl_canvas,0,8,num_of_rows,1, 2/8, 6/8, 1/8, 1/8,0,0.2);
		ruler_button.setMessage("  Toggle ruler  ",this.messages);
		ruler_button.onClick=function(button)
		{
			if(button.status || !self.caliber.enabled)
			{
				move_button.status=false;
				rotate_button.status=false;
				zoom_button.status=false;
				relight_button.status=false;
				roi_button.status=false;
				dimensions_button.buttons[0].status=true;
				dimensions_button.buttons[1].status=false;
				dimensions_button.obj=dimensions_button.buttons[0].obj_option;
				self.heightmap.set3Dmode(false);
			
				projection_button.buttons[0].status=false;
				projection_button.buttons[1].status=true;	
				projection_button.obj=projection_button.buttons[1].obj_option;
				self.camera.orthographicProjection();
								
				if(!self.caliber.enabled)
					button.status=true;
					
				self.caliber.setVisible(true);
				self.annotation.setVisible(false);
			}
			else
			{
				self.caliber.setVisible(false);
			}
				
		};
		this.ruler_button=ruler_button;

		var rendering_button=new DEAbutton(this.gl_canvas,4,8,num_of_rows,1, 3/8, 6/8, 1/8, 1/8,0,0.2);
		rendering_button.setMessage("  Change rendering mode  ",this.messages);
			option1=rendering_button.addOption(3/8, 6/8, 1/8, 1/8,0.2);
			option1.onClick=function(button)
			{
				rendering_button.buttons[0].status=false;
				rendering_button.buttons[1].status=false;
				rendering_button.buttons[2].status=false;
				button.status=true;
				rendering_button.obj=button.obj_option;
				rendering_button.parent.retractOptions();
				
				if(rendering_button.buttons[0].status)
					self.heightmap.setDrawModeTriangles();
				else if(rendering_button.buttons[1].status)
					self.heightmap.setDrawModeLines();
				else if(rendering_button.buttons[2].status)
					self.heightmap.setDrawModePoints();
				 
			};
			option1.status=true;
			option1.setMessage("  Surface rendering  ",this.messages);
			o=rendering_button.addOption(4/8, 6/8, 1/8, 1/8,0.2);
			o.onClick=option1.onClick;
			o.setMessage("  Edge rendering  ",this.messages);
			o=rendering_button.addOption(5/8, 6/8, 1/8, 1/8,0.2);
			o.onClick=option1.onClick;
			o.setMessage("  Vertex rendering  ",this.messages);
		this.rendering_button=rendering_button;

		var texture_button=new DEAbutton(this.gl_canvas,2,8,num_of_rows,1, 0.0, 5/8, 1/8, 1/8);
		texture_button.setMessage("  Change texture mode  ",this.messages);
			option1=texture_button.addOption(0.0, 5/8, 1/8, 1/8);
			option1.onClick=function(button)
			{
				texture_button.buttons[0].status=false;
				texture_button.buttons[1].status=false;
				texture_button.buttons[2].status=false;
				texture_button.buttons[3].status=false;
				texture_button.buttons[4].status=false;
				button.status=true;
				texture_button.obj=button.obj_option;
				texture_button.parent.retractOptions();
				
				if(texture_button.buttons[0].status)//no texture
				{
					self.heightmap.setTextureMode(0);
					lights_button.enabled=false;
					lights_button.status=true;
					self.heightmap.setLights(true);
				}
				else if(texture_button.buttons[1].status)//depth map
				{
					self.heightmap.setTextureMode(1);
					lights_button.enabled=true;
				}
				else if(texture_button.buttons[2].status)//edge map
				{
					self.heightmap.setTextureMode(2);
					lights_button.enabled=true;
				}
				else if(texture_button.buttons[4].status)//original image
				{
					self.heightmap.setTextureMode(3);
					lights_button.enabled=false;
				}
			};
			option1.status=true;
			option1.setMessage("  No texture.  ",this.messages);
			o=texture_button.addOption(1/8, 5/8, 1/8, 1/8);
			o.onClick=option1.onClick;
			o.setMessage("  Depth map  ",this.messages);
			o=texture_button.addOption(6/8, 5/8, 1/8, 1/8);
			o.onClick=option1.onClick;
			o.setMessage("  Edge map  ",this.messages);
			o=texture_button.addOption(2/8, 5/8, 1/8, 1/8);
			o.onClick=option1.onClick;
			o.setMessage("  Fingerprint map  ",this.messages);
			o=texture_button.addOption(3/8, 5/8, 1/8, 1/8);
			o.onClick=option1.onClick;
			o.setMessage("  Scanned image  ",this.messages);
			if(this.heightmap!=null && this.heightmap.images.length==1) o.enabled=false;
		this.texture_button=texture_button;

		var roi_button=new DEAbutton(this.gl_canvas,1,8,num_of_rows,1, 4/8, 5/8, 1/8, 1/8);
		roi_button.setMessage("  Regions of interest  ",this.messages);
		roi_button.onClick=function(button)
		{
			if(button.status || !self.caliber.enabled)
			{
				move_button.status=false;
				rotate_button.status=false;
				zoom_button.status=false;
				relight_button.status=false;
				ruler_button.status=false;
				
				dimensions_button.buttons[0].status=true;
				dimensions_button.buttons[1].status=false;
				dimensions_button.obj=dimensions_button.buttons[0].obj_option;
				self.heightmap.set3Dmode(false);
			
				projection_button.buttons[0].status=false;
				projection_button.buttons[1].status=true;	
				projection_button.obj=projection_button.buttons[1].obj_option;
				self.camera.orthographicProjection();
								
				if(!self.annotation.enabled)
					button.status=true;
					
				self.annotation.setVisible(true);
				self.caliber.setVisible(false);
			}
			else
			{
				self.annotation.setVisible(false);
			}
		};
		this.roi_button=roi_button;
		
		var lights_button=new DEAbutton(this.gl_canvas,3,8,num_of_rows,1, 5/8, 5/8, 1/8, 1/8);
		lights_button.setMessage("  Switch lighting on or off  ",this.messages);
		lights_button.status=true;
		lights_button.enabled=false;
		lights_button.onClick=function(button)
		{
			self.heightmap.setLights(button.status);
		};
		this.lights_button=lights_button;

		var dimensions_button=new DEAbutton(this.gl_canvas,6,8,num_of_rows,1, 7/8, 6/8, 1/8, 1/8);
		dimensions_button.setMessage("  Change dimensionality  ",this.messages);
		
		var option1=dimensions_button.addOption(7/8, 7/8, 1/8, 1/8);
			option1.onClick=function(button)
			{
				dimensions_button.buttons[0].status=false;
				dimensions_button.buttons[1].status=false;
				button.status=true;
				dimensions_button.obj=button.obj_option;
				dimensions_button.parent.retractOptions();
				if(dimensions_button.buttons[0].status)
					self.heightmap.set3Dmode(false);
				else if(dimensions_button.buttons[1].status)
				{
					self.heightmap.set3Dmode(true);
					ruler_button.status=false;	
					roi_button.status=false;
					self.caliber.setVisible(false);
					self.annotation.setVisible(false);
				}
			};
			option1.setMessage("  2D visualization  ",this.messages);
		var	o=dimensions_button.addOption(7/8, 6/8, 1/8, 1/8);
			o.status=true;
			o.onClick=option1.onClick;
			o.setMessage("  3D visualization  ",this.messages);
		this.dimensions_button=dimensions_button;

		
		var download_button=new DEAbutton(this.gl_canvas,7,8,num_of_rows,1, 6/8, 6/8, 1/8, 1/8);
		{
			var tokens=this.url.split("/");
			var id=tokens.pop().split(".")[0];
			var path=tokens.pop();
			path=path.substr(0,path.length-1);
			download_button.setLink("http://digitalepigraphy.github.io/legacy/download?"+path+"="+id);
		}
		download_button.setMessage("  Download object  ",this.messages);
		this.download_button=download_button;
		
		buttons=new Array();
		buttons[0]=ruler_button;
		buttons[1]=roi_button;
		buttons[2]=texture_button;
		buttons[3]=lights_button;
		buttons[4]=rendering_button;
		buttons[5]=projection_button;
		buttons[6]=dimensions_button;
		buttons[7]=download_button;
		this.v_gui=new DEAtoolbar(this.gl_canvas,num_of_rows,1,buttons,50);
		if(!this.fullscreen || this.heightmap==null) this.v_gui.setVisible(false);
				
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
		gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
		
		
		
		if(this.heightmap!=null) this.heightmap.loadAll();
		if(this.object!=null) this.object.load(this.url.substring(0,this.url.length-4));
	}
	
DEAtoolbox.prototype.draw=function()
	{
		this.frame_now+=1;
		
		if((this.heightmap!=null && !this.heightmap.D_is_loaded)||(this.object!=null && !this.object.object_is_loaded)) this.draw_now=true;
		else if(this.heightmap!=null && !this.heightmap.progressive_loading && this.frame_now%4!=0) return;
		
		if(this.heightmap!=null && this.heightmap.progressive_loading) 
		{
			if(this.loading_progress_now!=this.heightmap.getLoadingProgress())
			{
				this.loading_progress_now=this.heightmap.getLoadingProgress();
				this.draw_now=true;
			}
		}
		if(this.h_gui.needs_draw || this.v_gui.needs_draw) 
		{
			this.draw_now=true;
			this.h_gui.needs_draw=false;
			this.v_gui.needs_draw=false;
		}
		
		else if(this.h_gui.gui_animation==1 || this.v_gui.gui_animation==1)
		{
			var time_now=new Date().getTime();
			if(time_now-this.h_gui.lastTimeAction>=4000 || (this.visible && time_now-this.v_gui.lastTimeAction>=4000))
			{
				this.draw_now=true;
			}
		}
		
		if(this.draw_now==false) return;
		this.draw_now=false;
		
		//log('draw');
		
		var gl=this.gl_canvas.gl;
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		
		if(this.simple_background)
		{
			gl.disable(gl.DEPTH_TEST);
			this.skin.use();
			gl.useProgram(this.bkgShaderProgram);
			this.bkg.draw(this.bkgShaderProgram);
			gl.enable(gl.DEPTH_TEST);
		}
		
		if(this.heightmap!=null && this.heightmap.D_is_loaded)
			this.heightmap.draw();
		else if(this.object!=null && this.object.object_is_loaded)
			this.object.draw();
		else
			this.loading_obj.draw();

		if(!this.simple_background)
		{
			gl.enable(gl.CULL_FACE);
			this.room.draw(this.camera.pMatrix, this.camera.mvMatrix);
			gl.disable(gl.CULL_FACE);
			this.skin.use();	
		}
		
		if(this.relight_button.status && this.mouse_pressed)
			this.beams.draw();

		gl.disable(gl.DEPTH_TEST);
		
		if(this.heightmap!=null)
		{
			this.caliber.draw(this.camera.pMatrix, this.camera.mvMatrix);
			this.annotation.draw(this.camera.pMatrix, this.camera.mvMatrix);
		}
		
		gl.enable(gl.BLEND);
		
		if(this.heightmap!=null && this.heightmap.progressive_loading)
		{
			this.loading_line.value=this.heightmap.getLoadingProgress();
			this.loading_line.draw();
			this.draw_now=true;
		}
		
		
		this.messages.draw();
		this.h_gui.draw();
		this.v_gui.draw();
		
		gl.enable(gl.DEPTH_TEST);
	}

DEAtoolbox.prototype.handleMouseMove=function(x,y)
	{
		this.draw_now=true;
	
		this.h_gui.handleMouseMove(x[0],y[0]);
		this.v_gui.handleMouseMove(x[0],y[0]);
		
		if(this.mouse_pressed==true)
		{
			var dx=(x[0]-this.mouseX)/(this.gl_canvas.gl.viewportHeight);
			var dy=(y[0]-this.mouseY)/(this.gl_canvas.gl.viewportHeight)
			if(this.move_button.status==true)
				this.camera.translate(dx,dy);
			else if(this.rotate_button.status==true)
				this.camera.rotate(dx,dy);
			else if(this.zoom_button.status==true)
				this.camera.zooming(dx,dy);
			else if(this.relight_button.status==true)
				this.camera.relight(dx,dy);
			else if(this.ruler_button.status==true)
				if(this.heightmap!=null) this.caliber.handleMouseMove(x[0],y[0],dx,dy,this.camera.zoom);
			else if(this.roi_button.status==true)
				if(this.heightmap!=null) this.annotation.handleMouseMove(x[0],y[0],dx,dy);
		}
		
		this.mouseX = x[0];
       	this.mouseY = y[0];
	}
	
DEAtoolbox.prototype.handleMouseUp=function(x,y)
	{
		this.draw_now=true;
		this.h_gui.handleMouseUp(x[0],y[0]);
		this.v_gui.handleMouseUp(x[0],y[0]);
		if(this.heightmap!=null)
		{
			this.caliber.handleMouseUp(x[0],y[0]);
			this.annotation.handleMouseUp(x[0],y[0]);
		}
		this.mouse_pressed=false;
	}
	
DEAtoolbox.prototype.handleMouseDown=function(x,y)
	{
		this.draw_now=true;
		var action=this.h_gui.handleMouseDown(x[0],y[0]);
		action+=this.v_gui.handleMouseDown(x[0],y[0]);
		if(action==0)
		{
			this.h_gui.retract();
			this.v_gui.retract();
			if(this.heightmap!=null)
			{
				if(this.ruler_button.status==true)
					this.caliber.handleMouseDown(x[0],y[0]);
				if(this.roi_button.status==true)
					this.annotation.handleMouseDown(x[0],y[0]);
			}
			this.mouse_pressed=true;
			this.mouseX = x[0];
			this.mouseY = y[0];
		}
		return false;
	}
	
DEAtoolbox.prototype.handleMouseOut=function(x,y)
	{
		this.draw_now=true;
		this.h_gui.handleMouseOut(x[0],y[0]);
		this.v_gui.handleMouseOut(x[0],y[0]);
		if(this.heightmap!=null)
		{
			this.caliber.handleMouseOut(x[0],y[0]);
			this.annotation.handleMouseOut(x[0],y[0]);
		}
		this.mouse_pressed=false;
	}

function webGLStart(path,rid,fullscreen) {
	var full_screen="false";
	var background="simple";
	if(typeof fullscreen !== 'undefined')
		if(fullscreen) {full_screen="true"; background="simple";}

	var t=new DEAtoolbox(path+rid+"/Info.xml","inscription-canvas",[["fullscreen",full_screen],["background",background]]);
    }
	
function log(msg) {
    setTimeout(function() {
        throw new Error(msg);
    }, 0);
}