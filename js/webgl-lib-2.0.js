/* V2.0
 * Copyright 2013, Digital Worlds Institute, University of Florida
 * Angelos Barmpoutis.
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
 * article must be cited: A. Barmpoutis, 
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
 
function webGLcanvas(canvas_name)
{
  this.canvas_name=canvas_name;
  this.canvas= document.getElementById(this.canvas_name);
  this.canvas.width = document.body.clientWidth;
  this.canvas.height = document.body.clientHeight;
  this.gl=null;
  this.mvMatrix = mat4.create();
  this.mvMatrixStack = [];
  this.pMatrix = mat4.create();
  
  if(!this.init()) return;
  
  this.start=function(){
  this.setup();
  
  this.canvas.addEventListener("keydown", this.handleKeyDown, false);
  this.canvas.addEventListener("keyup", this.handleKeyUp, false);
  this.canvas.addEventListener("mousedown", this.handleMouseDown, false);
  this.canvas.addEventListener("mouseup", this.handleMouseUp, false);
  this.canvas.addEventListener("mousemove", this.handleMouseMove, false);
  this.canvas.addEventListener("touchstart", this.handleTouchStart, false);
  this.canvas.addEventListener("touchend", this.handleTouchEnd, false);
  this.canvas.addEventListener("touchcancel", this.handleTouchCancel, false);
  this.canvas.addEventListener("touchleave", this.handleTouchLeave, false);
  this.canvas.addEventListener("touchmove", this.handleTouchMove, false);
  if(!window.navigator.pointerEnabled)this.canvas.onmouseout = this.handleMouseOut;


  this.tick();};
} 

webGLcanvas.prototype.start=function(){}

webGLcanvas.prototype.mvPushMatrix=function() {
    var copy = mat4.create();
    mat4.set(this.mvMatrix, copy);
    this.mvMatrixStack.push(copy);
}

webGLcanvas.prototype.mvPopMatrix=function() {
    if (this.mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    this.mvMatrix = this.mvMatrixStack.pop();
}

webGLcanvas.prototype.setup=function(){}
webGLcanvas.prototype.draw=function(){}
webGLcanvas.prototype.handleKeys=function(){}
webGLcanvas.prototype.handleKeyDown=function(event){}
webGLcanvas.prototype.handleKeyUp=function(event){}
webGLcanvas.prototype.handleMouseDown=function(event){}
webGLcanvas.prototype.handleMouseUp=function(event){}
webGLcanvas.prototype.handleMouseMove=function(event){}
webGLcanvas.prototype.handleMouseOut=function(event){}
webGLcanvas.prototype.handleTouchStart=function(event){}
webGLcanvas.prototype.handleTouchEnd=function(event){}
webGLcanvas.prototype.handleTouchMove=function(event){}
webGLcanvas.prototype.handleTouchLeave=function(event){}
webGLcanvas.prototype.handleTouchCancel=function(event){}

webGLcanvas.prototype.tick=function()
{
	var obj=this;
	requestAnimFrame(function(){obj.tick();});
    this.handleKeys();
    this.draw();
}

webGLcanvas.prototype.init=function()
{
        try {
            this.gl = this.canvas.getContext("experimental-webgl",{antialias:true});
            this.gl.viewportWidth = this.canvas.width;
            this.gl.viewportHeight = this.canvas.height;
			//log(this.gl.getParameter(this.gl.SAMPLES));
        } catch (e) {
        }
        if (!this.gl) {
		if (this.canvas.getContext) {
              var ctx=this.canvas.getContext("2d");
		var imageObj = new Image();
		imageObj.crossOrigin = '';
		var cnvs=this.canvas;
	      imageObj.onload = function() {
	        ctx.drawImage(imageObj, 0, 0, cnvs.width, cnvs.height);
		    cnvs.addEventListener('click', function() { window.open("https://digitalepigraphy.github.io/legacy/toolbox/info.html");}, false);
      		};
      		imageObj.src = 'webgl_error.png';
			}
			else
			{
				var e=document.getElementById('error-message');
				e.innerHTML='<a href="https://digitalepigraphy.github.io/legacy/toolbox/info.html" target="_blank"><img src="webgl_error.png" width="'+cnvs.width+'" height="'+cnvs.height+'"/></a>';
			}
			return false;
        }
		else return true;
}

 
function webGLshape(gl) //Constructor
{
	this.gl=gl;
    this.vertexPositionBuffer=null;
    this.vertexNormalBuffer=null;
	this.vertexColorBuffer=null;
	this.vertexColor2Buffer=null;
	this.vertexColor3Buffer=null;
	this.vertexColor4Buffer=null;
    this.vertexTextureCoordBuffer=null;
    this.vertexIndexBuffer=null;
	this.TRI_vertexIndexBuffer=null;
	this.LIN_vertexIndexBuffer=null;
	this.POI_vertexIndexBuffer=null;
    this.fid=0;
    this.filename="";
	this.corners=null;
	this.projectedCorners=null;
	this.num_of_corners=0;
}

webGLshape.prototype.setCorners=function(corners)
{
	this.corners=corners;
	this.num_of_corners=this.corners.length/3;
	this.projectedCorners=new Float32Array(this.num_of_corners*2);
}

webGLshape.prototype.projectCorners=function(modelViewPerspMatrix,width,height)
 {
   if(this.num_of_corners==0) return;
   var newPos = [0, 0, 0, 0];
   var cameraPos = [0, 0, 0, 1];
   var idx=0;
   var idx2=0;
   for(var i=0;i<this.num_of_corners;i++)
   {
		cameraPos = [this.corners[idx], this.corners[idx+1], this.corners[idx+2], 1];
		mat4.multiplyVec4(modelViewPerspMatrix, cameraPos, newPos);
		this.projectedCorners[idx2]=width*(1+newPos[0]/newPos[3])/2;
		this.projectedCorners[idx2+1]=height*(1-newPos[1]/newPos[3])/2;
		idx+=3;
		idx2+=2;
   }
 }
 
 webGLshape.prototype.insideConvex=function(x,y)
 {
   if(this.num_of_corners==0) return false;
   var p1=0;
   var p2=0;
   var out=false;
   var v=0;
   
   for(var i=0;i<this.num_of_corners && !out;i++)
   {
		p1=i;
		p2=i+1;
		if(p2==this.num_of_corners)p2=0;
		v = (this.projectedCorners[p2*2+1] - this.projectedCorners[p1*2+1]) * x + (this.projectedCorners[p1*2+0] - this.projectedCorners[p2*2+0]) *y + (this.projectedCorners[p2*2+0] * this.projectedCorners[p1*2+1]) - (this.projectedCorners[p1*2+0] * this.projectedCorners[p2*2+1]);
		if(v<0) out=true;
   }
   
   return !out;
 }

 //assumes that three corners are given, the one that corresponds to the following points on a plane: (0,0), (1,0), (0,1)
 webGLshape.prototype.onPlane=function(x,y)
 {
   var a=this.projectedCorners[2]-this.projectedCorners[0];
   var b=this.projectedCorners[3]-this.projectedCorners[1];
   var c=this.projectedCorners[4]-this.projectedCorners[0];
   var d=this.projectedCorners[5]-this.projectedCorners[1];
   var det=a*d-b*c;
   var inv_a=d/det;
   var inv_b=-b/det;
   var inv_c=-c/det;
   var inv_d=a/det;
   x=x-this.projectedCorners[0];
   y=y-this.projectedCorners[1];
   return [inv_a*x+inv_c*y, inv_b*x+inv_d*y];
   
 }
 
webGLshape.prototype.setXYZ=function(vertices)
{
	var gl=this.gl;
	if(this.vertexPositionBuffer==null) this.vertexPositionBuffer = gl.createBuffer();
       gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);    
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
       this.vertexPositionBuffer.itemSize = 3;
       this.vertexPositionBuffer.numItems = vertices.length/3;
}

webGLshape.prototype.setNormals=function(vertices)
{
	var gl=this.gl;
	if(this.vertexNormalBuffer==null) this.vertexNormalBuffer = gl.createBuffer();
       gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);    
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
       this.vertexNormalBuffer.itemSize = 3;
       this.vertexNormalBuffer.numItems = vertices.length/3;
}

webGLshape.prototype.setColors=function(colors)
{
	var gl=this.gl;
	if(this.vertexColorBuffer==null) this.vertexColorBuffer = gl.createBuffer();
       gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColorBuffer);    
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
       this.vertexColorBuffer.itemSize = 3;
       this.vertexColorBuffer.numItems = colors.length/3;
}

webGLshape.prototype.setColors2=function(colors)
{
	var gl=this.gl;
	this.vertexColor2Buffer = gl.createBuffer();
       gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColor2Buffer);    
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
       this.vertexColor2Buffer.itemSize = 3;
       this.vertexColor2Buffer.numItems = colors.length/3;
}

webGLshape.prototype.setColors3=function(colors)
{
	var gl=this.gl;
	this.vertexColor3Buffer = gl.createBuffer();
       gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColor3Buffer);    
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
       this.vertexColor3Buffer.itemSize = 3;
       this.vertexColor3Buffer.numItems = colors.length/3;
}

webGLshape.prototype.setColors4=function(colors)
{
	var gl=this.gl;
	this.vertexColor4Buffer = gl.createBuffer();
       gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColor4Buffer);    
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
       this.vertexColor4Buffer.itemSize = 3;
       this.vertexColor4Buffer.numItems = colors.length/3;
}

webGLshape.prototype.setUV=function(vertices)
{
	var gl=this.gl;
	if(this.vertexTextureCoordBuffer==null) this.vertexTextureCoordBuffer = gl.createBuffer();
       gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);    
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
       this.vertexTextureCoordBuffer.itemSize = 2;
       this.vertexTextureCoordBuffer.numItems = vertices.length/2;
}

webGLshape.prototype.setTRI=function(vertices)
{
	var gl=this.gl;
	if(this.TRI_vertexIndexBuffer==null) this.TRI_vertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.TRI_vertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertices), gl.STATIC_DRAW);
    this.TRI_vertexIndexBuffer.itemSize = 1;
    this.TRI_vertexIndexBuffer.numItems = vertices.length;
	
	this.vertexIndexBuffer=this.TRI_vertexIndexBuffer;
	this.shape=gl.TRIANGLES;
}

webGLshape.prototype.setPOI=function(vertices)
{
	var gl=this.gl;
	if(this.POI_vertexIndexBuffer==null) this.POI_vertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.POI_vertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertices), gl.STATIC_DRAW);
    this.POI_vertexIndexBuffer.itemSize = 1;
    this.POI_vertexIndexBuffer.numItems = vertices.length;
	
	this.vertexIndexBuffer=this.POI_vertexIndexBuffer;
	this.shape=gl.POINTS;
}

webGLshape.prototype.setLIN=function(vertices)
{
	var gl=this.gl;
	if(this.LIN_vertexIndexBuffer==null) this.LIN_vertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.LIN_vertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertices), gl.STATIC_DRAW);
    this.LIN_vertexIndexBuffer.itemSize = 1;
    this.LIN_vertexIndexBuffer.numItems = vertices.length;
	
	this.vertexIndexBuffer=this.LIN_vertexIndexBuffer;
	this.shape=gl.LINES;
}

webGLshape.prototype.setDrawModeLines=function()
{
	if(this.LIN_vertexIndexBuffer!=null)
	{
		this.vertexIndexBuffer=this.LIN_vertexIndexBuffer;
		this.shape=this.gl.LINES;
	}
}

webGLshape.prototype.setDrawModePoints=function()
{
	if(this.POI_vertexIndexBuffer!=null)
	{
		this.vertexIndexBuffer=this.POI_vertexIndexBuffer;
		this.shape=this.gl.POINTS;
	}
}

webGLshape.prototype.setDrawModeTriangles=function()
{
	if(this.TRI_vertexIndexBuffer!=null)
	{
		this.vertexIndexBuffer=this.TRI_vertexIndexBuffer;
		this.shape=this.gl.TRIANGLES;
	}
}

webGLshape.prototype.draw=function(shaderProgram)
{
	var gl=this.gl;
	if(this.vertexPositionBuffer!=null)
	{
	 gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
	}
	
	if(this.vertexNormalBuffer!=null)
	{
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, this.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
	}

	if(this.vertexColorBuffer!=null)
	{
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColorBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, this.vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
	}
	
	if(this.vertexTextureCoordBuffer!=null)
	{
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
	}

	if(this.vertexIndexBuffer!=null)
	{
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
	    gl.drawElements(this.shape, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	}
}

webGLshape.prototype.drawHeightmap=function(shaderProgram)
{
	var gl=this.gl;
	if(this.vertexPositionBuffer!=null)
	{
	 gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
	}
	
	if(this.vertexNormalBuffer!=null)
	{
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, this.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
	}

	if(this.vertexColorBuffer!=null)
	{
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColorBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, this.vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColor2Buffer);
		gl.vertexAttribPointer(shaderProgram.vertexColor2Attribute, this.vertexColor2Buffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColor3Buffer);
		gl.vertexAttribPointer(shaderProgram.vertexColor3Attribute, this.vertexColor3Buffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColor4Buffer);
		gl.vertexAttribPointer(shaderProgram.vertexColor4Attribute, this.vertexColor4Buffer.itemSize, gl.FLOAT, false, 0, 0);
	}
	
	if(this.vertexTextureCoordBuffer!=null)
	{
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
	}

	if(this.vertexIndexBuffer!=null)
	{
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
	    gl.drawElements(this.shape, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	}
}

webGLshape.prototype.handleLoadedObject=function(txt)
{ 
	var lines=txt.split("#");
	var xyz=new Float32Array(lines[0].split(","));
	var nrm=new Float32Array(lines[1].split(","));
	var tri=new Uint16Array(lines[2].split(","));
	this.setXYZ(xyz);
	this.setTRI(tri);
	this.setNormals(nrm);
	this.setColors(xyz);
	draw_now=true;
}

webGLshape.prototype.downloadLowRes=function(fnm,id)
{
  this.filename=fnm;
  this.fid=id;
  var file_request;
  if (window.XMLHttpRequest)
  {// code for IE7+, Firefox, Chrome, Opera, Safari
  	file_request=new XMLHttpRequest();
  }
  else
  {// code for IE6, IE5
  	file_request=new ActiveXObject("Microsoft.XMLHTTP");
  }	
  var o=this;
  file_request.onreadystatechange=function()
  {
	if (file_request.readyState==4 && file_request.status==200)
	{
		o.handleLoadedObject(file_request.responseText);
		o.downloadHighRes();
	}
  }

  file_request.open("GET",this.filename+".low."+(this.fid+1),true);
  file_request.send();
}

webGLshape.prototype.downloadHighRes=function()
{
  var file_request;
  if (window.XMLHttpRequest)
  {// code for IE7+, Firefox, Chrome, Opera, Safari
  	file_request=new XMLHttpRequest();
  }
  else
  {// code for IE6, IE5
  	file_request=new ActiveXObject("Microsoft.XMLHTTP");
  }	
  var o=this;
  file_request.onreadystatechange=function()
  {
	if (file_request.readyState==4 && file_request.status==200)
			o.handleLoadedObject(file_request.responseText);
  }

  file_request.open("GET",this.filename+"."+(this.fid+1),true);
  file_request.send();
}

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

function createRect(gl,w,h,u,v)
{
	var _obj=new webGLshape(gl);
	var _xyz=new Float32Array(4*3);
	var _uv=new Float32Array(4*2);
	var _tri=new Uint16Array(2*3);
	
	_xyz[0]=w/2.0; _xyz[1]=h/2.0; _xyz[2]=0;
	_xyz[3]=-w/2.0; _xyz[4]=h/2.0; _xyz[5]=0;
	_xyz[6]=-w/2.0; _xyz[7]=-h/2.0; _xyz[8]=0;
	_xyz[9]=w/2.0; _xyz[10]=-h/2.0; _xyz[11]=0;
	
	_tri[0]=0;_tri[1]=1;_tri[2]=2;
	_tri[3]=0;_tri[4]=2;_tri[5]=3;

	_uv[0]=u;_uv[1]=v;
	_uv[2]=0;_uv[3]=v;
	_uv[4]=0;_uv[5]=0;
	_uv[6]=u;_uv[7]=0;
	
	_obj.setXYZ(_xyz);
	_obj.setTRI(_tri);
	_obj.setUV(_uv);
	return _obj;
}

function createSphere(gl,radius_xz, radius_y, repetitions, from_phi,to_phi,resolution_phi,from_theta,to_theta,resolution_theta)
{
	var _obj=new webGLshape(gl);
	var _xyz=new Array();
	var _uv=new Array();
	var _tri=new Array();
	var theta;
	var v;
	var theta_next;
	var v_next;
	var sin_theta;
	var cos_theta;
	var sin_theta_next;
	var cos_theta_next;
	var phi;
	var u;
	var phi_next;
	var u_next;
	var sin_phi;
	var cos_phi;
    var sin_phi_next;
	var cos_phi_next;
	var offset_u=0;
	var quad=0;
	for(j=from_theta;j<to_theta-1;j++)
		{	
			theta=(j*3.1416)/(2*(resolution_theta-1));
			v=(j-from_theta)/(to_theta-from_theta-1);
			theta_next=((j+1)*3.1416)/(2*(resolution_theta-1));
			v_next=(j-from_theta+1)/(to_theta-from_theta-1);
			sin_theta=Math.sin(theta);
			cos_theta=Math.cos(theta);
			sin_theta_next=Math.sin(theta_next);
			cos_theta_next=Math.cos(theta_next);
			
			for(k=from_phi;k<to_phi-1;k++)
			{
				phi=-3.1416/2+(k*3.1416)/(resolution_phi-1);
				u=offset_u+repetitions*(k-from_phi)/(to_phi-from_phi-1);
				phi_next=-3.1416/2+((k+1)*3.1416)/(resolution_phi-1);
				u_next=offset_u+repetitions*(k-from_phi+1)/(to_phi-from_phi-1);
				sin_phi=Math.sin(phi);
				cos_phi=Math.cos(phi);
				sin_phi_next=Math.sin(phi_next);
				cos_phi_next=Math.cos(phi_next);
				
				_uv[_uv.length]=u;_uv[_uv.length]=v;
				_xyz[_xyz.length]=sin_phi*cos_theta*radius_xz;_xyz[_xyz.length]=sin_theta*radius_y;_xyz[_xyz.length]=-cos_phi*cos_theta*radius_xz;
				_uv[_uv.length]=u_next;_uv[_uv.length]=v;
				_xyz[_xyz.length]=sin_phi_next*cos_theta*radius_xz;_xyz[_xyz.length]=sin_theta*radius_y;_xyz[_xyz.length]=-cos_phi_next*cos_theta*radius_xz;
				_uv[_uv.length]=u_next;_uv[_uv.length]=v_next;
				_xyz[_xyz.length]=sin_phi_next*cos_theta_next*radius_xz;_xyz[_xyz.length]=sin_theta_next*radius_y;_xyz[_xyz.length]=-cos_phi_next*cos_theta_next*radius_xz;
				_uv[_uv.length]=u;_uv[_uv.length]=v_next;
				_xyz[_xyz.length]=sin_phi*cos_theta_next*radius_xz;_xyz[_xyz.length]=sin_theta_next*radius_y;_xyz[_xyz.length]=-cos_phi*cos_theta_next*radius_xz;
				_tri[_tri.length]=quad*4;
				_tri[_tri.length]=quad*4+1;
				_tri[_tri.length]=quad*4+2;
				_tri[_tri.length]=quad*4;
				_tri[_tri.length]=quad*4+2;
				_tri[_tri.length]=quad*4+3;
				quad+=1;
			}
		}	
	_obj.setXYZ(_xyz);
	_obj.setTRI(_tri);
	_obj.setUV(_uv);
	return _obj;
}

var convert_texture_canvas = document.createElement('canvas')
     convert_texture_canvas.width = 512;
     convert_texture_canvas.height = 512;
var convert_texture_ctx = convert_texture_canvas.getContext('2d');   

var default_texture_image=new Image();
default_texture_image.crossOrigin = '';

function webGLtexture(gl,filename,name)
{
	this.gl=gl;
	this.texture = gl.createTexture();
    this.texture.image = new Image();
	this.texture.image.crossOrigin = '';
	if(typeof name !== 'undefined')
		this.name=name;
	else this.name="";
		
	/*gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, default_texture_image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);*/
		
	if(typeof filename !== 'undefined')
	{
		var t=this;
		this.texture.image.onload = function () {
				t.handleLoadedTexture();
			}
		this.texture.image.src = filename;
	}
}

webGLtexture.prototype.handleLoadedTexture=function() {
	var gl=this.gl;
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.texture.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

webGLtexture.prototype.update=function(video_source)
{
	if( video_source.readyState === video_source.HAVE_ENOUGH_DATA ){
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.bindTexture(gl.TEXTURE_2D, this.texture);
	convert_texture_ctx.drawImage(video_source,0,0, 512, 512);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, convert_texture_ctx.getImageData(0,0,512,512));
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	}
}
	
webGLtexture.prototype.use=function()
{
	var gl=this.gl;
	gl.bindTexture(gl.TEXTURE_2D, this.texture);
}

function webGLinstruction(image_composition)
{
	this.id=0;
	this.image_composition=image_composition;
}

webGLinstruction.prototype.translate=function(x,y,z)
{
	this.id=1;
	this.valf=[x,y,z];
}

webGLinstruction.prototype.rotate=function(angle,x,y,z)
{
	this.id=2;
	this.valf=[degToRad(angle),x,y,z];
}
		
webGLinstruction.prototype.pushMatrix=function()
{
	this.id=3;		
}
		
webGLinstruction.prototype.popMatrix=function()
{
	this.id=4;
}
		
webGLinstruction.prototype.begin=function(type)
{
	this.id=5;
	this.vali=[type];
}
		
webGLinstruction.prototype.end=function(obj)
{
	this.id=6;
	this.obj=obj;
}
		
webGLinstruction.prototype.enable=function(type)
{
	this.id=7;
	this.vali=[type];
}
		
webGLinstruction.prototype.disable=function(type)
{
	this.id=8;
	this.vali=[type];
}
		
webGLinstruction.prototype.vertex=function(x,y,z)
{
	this.id=9;
	this.valf=[x,y,z];
}
		
webGLinstruction.prototype.texcoord=function(u,v)
{
	this.id=10;
	this.valf=[u,v];
}
		
webGLinstruction.prototype.color=function(r,g,b)
{
	this.id=11;
	this.valf=[r,g,b];
}
		
webGLinstruction.prototype.bindTexture=function(texture)
{
	this.id=12;
	this.texture=texture;
}
		
webGLinstruction.prototype.rectange=function(w,h,u,v)
{
	this.id=13;
	this.valf=[w,h,u,v];
}
		
webGLinstruction.prototype.clearColor=function(r,g,b)
{
	this.id=14;
	this.valf=[r,g,b];
}

webGLinstruction.prototype.command=function()
{
	switch(this.id)
	{
	case 1:
		return "translate";
	case 2:
		return "rotate";
	case 3:
		return "pushMatrix";
	case 4:
		return "popMatrix";
	case 5:
		return "begin";
	case 6:
		return "end";
	case 7:
		return "enable";
	case 8:
		return "disable";
	case 9:
		return "vertex";
	case 10:
		return "texCoord";
	case 11:
		return "color";
	case 12:
		return "bindTexture";
	case 13:
		return "rectangle";
	case 14:
		return "clearColor";
	};
	return "";
}

webGLinstruction.prototype.execute=function()
{
	var gl=this.image_composition.gl;
	switch(this.id)
	{
	case 1:
		mat4.translate(this.image_composition.mvMatrix,this.valf);
		break;
	case 2:
		mat4.rotate(this.image_composition.mvMatrix, this.valf[0],[this.valf[1],this.valf[2],this.valf[3]]);
		break;
	case 3:
		this.image_composition.mvPushMatrix();
		break;
	case 4:
		this.image_composition.mvPopMatrix();
		break;
	case 5:
		//gl.glBegin(this.vali[0]);
		break;
	case 6:
		//gl.glEnd();
		this.image_composition.gl.uniformMatrix4fv(this.image_composition.shaderProgram.mvMatrixUniform, false, this.image_composition.mvMatrix);
		this.obj.draw(this.image_composition.shaderProgram);
		break;
	case 7:
		this.image_composition.gl.enable(this.vali[0]);
		break;
	case 8:
		this.image_composition.gl.disable(this.vali[0]);
		break;
	case 9:
		//gl.glVertex3f(this.valf[0],this.valf[1],this.valf[2]);
		break;
	case 10:
		//gl.glTexCoord2f(this.valf[0],this.valf[1]);
		break;
	case 11:
		//gl.glColor3f(this.valf[0], this.valf[1], this.valf[2]);
		this.image_composition.gl.uniform4f(this.image_composition.shaderProgram.uColorMask,this.valf[0], this.valf[1], this.valf[2],1);
		break;
	case 12:
		if(this.texture!=null && this.texture.texture!=-1)this.image_composition.gl.bindTexture(this.image_composition.gl.TEXTURE_2D, this.texture.texture);
		break;
	case 13:
		if(typeof this.obj !== 'undefined')
		{
			this.image_composition.gl.uniformMatrix4fv(this.image_composition.shaderProgram.mvMatrixUniform, false, this.image_composition.mvMatrix);
			this.obj.draw(this.image_composition.shaderProgram);
		}
		else this.obj=createRect(this.image_composition.gl,this.valf[0],this.valf[1],this.valf[2],this.valf[3]);
		break;
	case 14:
		this.image_composition.gl.clearColor(this.valf[0],this.valf[1],this.valf[2],1.0);
		break;
	};
}

function createGUIVertexShader(gl)
 {
        var source="";
    	 source+="	attribute vec3 aVertexPosition;		";
    	 source+="	attribute vec2 aTextureCoord;		";
	 source+="	uniform mat4 uMVMatrix;			";
   	 source+="	uniform mat4 uPMatrix;			";
	 source+="	varying vec2 vTextureCoord;			";

    	 source+="	void main(void) {	";
        source+="	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);	";
        source+="	vTextureCoord = aTextureCoord;	";
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
	
function createGUIFragmentShader(gl)
    {
        var source="";
    	 source+="	precision mediump float;		";
    	 source+="	varying vec2 vTextureCoord;		";
	 source+="    uniform sampler2D uSampler;		";
	 source+="	uniform vec4 uColorMask;		";
	 source+="	uniform vec4 uBrightness;		";

    	 source+="	void main(void) {			";
	 source+="	vec4 textureColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));	";
        source+="	gl_FragColor = uBrightness*uColorMask*textureColor;	";
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
	
function createGUIShaders(gl) {
        var fragmentShader = createGUIFragmentShader(gl);
        var vertexShader = createGUIVertexShader(gl);
		
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

        shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
        gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
        shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
	 shaderProgram.uColorMask = gl.getUniformLocation(shaderProgram, "uColorMask");
 
     shaderProgram.uBrightness = gl.getUniformLocation(shaderProgram, "uBrightness"); 
 	 
	gl.uniform4f(shaderProgram.uColorMask,1,1,1,1);
	gl.uniform4f(shaderProgram.uBrightness,1,1,1,1);
	
	 return shaderProgram;
    }
 

function webGLimageComposition(gl,fnm)
{
	this.gl=gl;
	this.filename=fnm;
	this.loaded=false;
	this.mvMatrixStack = [];
	this.mvMatrix=null;
	this.shaderProgram=createGUIShaders(this.gl);
	this.brightness=1;
	
	this.instructions=new Array();
	this.textures=new Array();
	var file_request;
	if (window.XMLHttpRequest)
	{// code for IE7+, Firefox, Chrome, Opera, Safari
		file_request=new XMLHttpRequest();
	}
	else
	{// code for IE6, IE5
		file_request=new ActiveXObject("Microsoft.XMLHTTP");
	}	
	var o=this;
	file_request.onreadystatechange=function()
	{
		if (file_request.readyState==4 && file_request.status==200)
		{
			o.handleLoadedFile(file_request.responseText);
		}
	}

	file_request.open("GET",this.filename+"/cgi",true);
	file_request.send();
}

webGLimageComposition.prototype.setBrightness=function(v)
{
	this.brightness=v;
	this.gl.uniform4f(this.shaderProgram.uBrightness,this.brightness,this.brightness,this.brightness,1);
}

webGLimageComposition.prototype.decreaseBrightness=function(v)
{
	this.brightness-=v;
	if(this.brightness<0)this.brightness=0;
	this.gl.uniform4f(this.shaderProgram.uBrightness,this.brightness,this.brightness,this.brightness,1);
}

webGLimageComposition.prototype.increaseBrightness=function(v)
{
	this.brightness+=v;
	if(this.brightness>1)this.brightness=1;
	this.gl.uniform4f(this.shaderProgram.uBrightness,this.brightness,this.brightness,this.brightness,1);
}

webGLimageComposition.prototype.mvPushMatrix=function() {
    var copy = mat4.create();
    mat4.set(this.mvMatrix, copy);
    this.mvMatrixStack.push(copy);
}

webGLimageComposition.prototype.mvPopMatrix=function() {
    if (this.mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    this.mvMatrix = this.mvMatrixStack.pop();
}

webGLimageComposition.prototype.getKeywordID=function(s)
{
	if(s.toUpperCase()==="LINES") return this.gl.LINES;
	else if(s.toUpperCase()==="TRIANGLES") return this.gl.TRIANGLES;
	else if(s.toUpperCase()==="QUADS") return "QUADS";
	else if(s.toUpperCase()==="TEXTURES") return "TEXTURES";
	else if(s.toUpperCase()==="DEPTH_TEST") return this.gl.DEPTH_TEST;
	else if(s.toUpperCase()==="BLEND") return this.gl.BLEND;
	else return 0;
}

webGLimageComposition.prototype.getTextureByName=function(s)
{
	var found=-1;
	var ret;
	for(var i=0;i<this.textures.length && found==-1;i++)
	{
		if(this.textures[i].name.toUpperCase()===s.toUpperCase())
		{
			found=i;
			ret=this.textures[i];
		}
	}
	return ret;
}

webGLimageComposition.prototype.handleLoadedFile=function(text)
{
	var gl=this.gl;
	var line=text.split("\n");
	for(l=0;l<line.length;l++)
	{
		var tokens=line[l].split(/\s+/);
		
		if(tokens.length>1 && tokens[0].length==0)
		{
			var tokens2=new Array();
			for(i=1;i<tokens.length;i++)
					tokens2[i-1]=tokens[i];
			tokens=tokens2;
		}

		if(tokens.length>=4 && tokens[0].toUpperCase()==="TRANSLATE")
		{
			var i=new webGLinstruction(this);
			i.translate(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
			this.instructions[this.instructions.length]=i;
		}
		else if(tokens.length>=5 && tokens[0].toUpperCase()==="ROTATE")
		{
			var i=new webGLinstruction(this);
			i.rotate(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]), parseFloat(tokens[4]));
			this.instructions[this.instructions.length]=i;
		}
		else if(tokens.length>=1 && tokens[0].toUpperCase()==="PUSHMATRIX")
		{
			var i=new webGLinstruction(this);
			i.pushMatrix();
			this.instructions[this.instructions.length]=i;
		}
		else if(tokens.length>=1 && tokens[0].toUpperCase()==="POPMATRIX")
		{
			var i=new webGLinstruction(this);
			i.popMatrix();
			this.instructions[this.instructions.length]=i;
		}
		else if(tokens.length>=2 && tokens[0].toUpperCase()==="BEGIN")
		{
			var i=new webGLinstruction(this);
			i.begin(this.getKeywordID(tokens[1]));
			this.instructions[this.instructions.length]=i;
			this.mem_begin=i.vali[0];
			this.mem_xyz=new Array();
			//this.mem_clr=new Array();
			this.mem_uv=new Array();
		}
		else if(tokens.length>=1 && tokens[0].toUpperCase()==="END")
		{
			var i=new webGLinstruction(this);
			var obj=new webGLshape(gl);
			if(this.mem_begin==gl.TRIANGLES)
			{
				obj.setXYZ(this.mem_xyz);
				var s=this.mem_xyz.length/3;
				var mem_tri=new Uint16Array(s);
				for(j=0;j<s;j++)mem_tri[j]=j;
				obj.setTRI(mem_tri);
				obj.setUV(this.mem_uv);
			}
			else if(this.mem_begin==="QUADS")
			{
				obj.setXYZ(this.mem_xyz);
				var s=this.mem_xyz.length/12;
				var mem_tri=new Uint16Array(s*6);
				for(j=0;j<s;j++)
				{
					mem_tri[j*6]=j*4;
					mem_tri[j*6+1]=j*4+1;
					mem_tri[j*6+2]=j*4+2;
					mem_tri[j*6+3]=j*4;
					mem_tri[j*6+4]=j*4+2;
					mem_tri[j*6+5]=j*4+3;
				}
				obj.setTRI(mem_tri);
				obj.setUV(this.mem_uv);
			}
			i.end(obj);
			this.instructions[this.instructions.length]=i;
		}
		else if(tokens.length>=2 && tokens[0].toUpperCase()==="ENABLE")
		{
			var i=new webGLinstruction(this);
			i.enable(this.getKeywordID(tokens[1]));
			if(i.vali[0]=="TEXTURES")
			{}
			else
			this.instructions[this.instructions.length]=i;
		}
		else if(tokens.length>=2 && tokens[0].toUpperCase()==="DISABLE")
		{
			var i=new webGLinstruction(this);
			i.disable(this.getKeywordID(tokens[1]));
			if(i.vali[0]=="TEXTURES")
			{}
			else
			this.instructions[this.instructions.length]=i;
		}
		else if(tokens.length>=4 && tokens[0].toUpperCase()==="VERTEX")
		{
			var i=new webGLinstruction(this);
			i.vertex(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
			this.instructions[this.instructions.length]=i;
			this.mem_xyz[this.mem_xyz.length]=i.valf[0];
			this.mem_xyz[this.mem_xyz.length]=i.valf[1];
			this.mem_xyz[this.mem_xyz.length]=i.valf[2];
		}
		else if(tokens.length>=3 && tokens[0].toUpperCase()==="TEXCOORD")
		{
			var i=new webGLinstruction(this);
			i.texcoord(parseFloat(tokens[1]), parseFloat(tokens[2]));
			this.instructions[this.instructions.length]=i;
			this.mem_uv[this.mem_uv.length]=i.valf[0];
			this.mem_uv[this.mem_uv.length]=i.valf[1];
		}
		else if(tokens.length>=4 && tokens[0].toUpperCase()==="COLOR")
		{
			var i=new webGLinstruction(this);
			i.color(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
			this.instructions[this.instructions.length]=i;
			//this.mem_clr[this.mem_clr.length]=i.valf[0];
			//this.mem_clr[this.mem_clr.length]=i.valf[1];
			//this.mem_clr[this.mem_clr.length]=i.valf[2];
		}
		else if(tokens.length>=2 && tokens[0].toUpperCase()==="BINDTEXTURE")
		{
			var i=new webGLinstruction(this);
			i.bindTexture(this.getTextureByName(tokens[1]));
			this.instructions[this.instructions.length]=i;
		}
		else if(tokens.length>=3 && tokens[0].toUpperCase()==="TEXTURE")
		{
			var t=new webGLtexture(gl,this.filename+"/"+tokens[2],tokens[1]);
			this.textures[this.textures.length]=t;
		}
		else if(tokens.length>=3 && tokens[0].toUpperCase()==="ALPHATEXTURE")
		{
			var t=new webGLtexture(gl,this.filename+"/"+tokens[2],tokens[1]);
			this.textures[this.textures.length]=t;
		}
		else if(tokens.length>=5 && tokens[0].toUpperCase()==="RECTANGLE")
		{
			var i=new webGLinstruction(this);
			i.rectange(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]), parseFloat(tokens[4]));
			this.instructions[this.instructions.length]=i;
		}
		else if(tokens.length>=3 && tokens[0].toUpperCase()==="RECTANGLE")
		{
			var i=new webGLinstruction(this);
			i.rectange(parseFloat(tokens[1]), parseFloat(tokens[2]), 1,1);
			this.instructions[this.instructions.length]=i;
		}
		else if(tokens.length>=4 && tokens[0].toUpperCase()==="CLEARCOLOR")
		{
			var i=new webGLinstruction(this);
			i.clearColor(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
			this.instructions[this.instructions.length]=i;
		}
	}
	this.loaded=true;
}

webGLimageComposition.prototype.draw=function(pMatrix,mvMatrix)
{
	if(this.loaded==false)return;
	this.mvMatrix= mat4.create();
    mat4.set(mvMatrix,this.mvMatrix);
	this.gl.useProgram(this.shaderProgram);
	this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, pMatrix);
	this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
	
	for(i=0;i<this.instructions.length;i++)
		this.instructions[i].execute();
}

function webGLcamera(gl_canvas)
{
	this.gl=gl_canvas.gl;
	this.animation_frames=0;
	this.anim_zoom0=0.0;
	this.anim_rotx0=0.0;
	this.anim_roty0=0.0;
	this.anim_zoom1=0.0;
	this.anim_rotx1=0.0;
	this.anim_roty1=0.0;
	this.anim_zoom2=0.0;
	this.anim_rotx2=0.0;
	this.anim_roty2=0.0;
	this.total_animation_frames=800;
	
	this.zoom=1;
	this.xRot=0;
	this.yRot=0;
	this.scale=1;
	this.xTra=0;
	this.yTra=0;
	
	this.xLig = 0.6;
    this.yLig = -0.3;
	
	this.mvMatrix = mat4.create();
	mat4.identity(this.mvMatrix);

	this.pMatrix = mat4.create();
	mat4.perspective(45, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0, this.pMatrix);
	this.projection_changed=true;
	this.view_changed=true;
	this.light_changed=true;
}

webGLcamera.prototype.orthographicProjection=function()
{
	mat4.ortho(-0.82*this.gl.viewportWidth / this.gl.viewportHeight, 0.82*this.gl.viewportWidth / this.gl.viewportHeight, -0.82,0.82,0.1,100.0, this.pMatrix);
	this.projection_changed=true;
}
 
webGLcamera.prototype.perspectiveProjection=function()
{
	mat4.perspective(45, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0, this.pMatrix);
	this.projection_changed=true;
}

webGLcamera.prototype.translate=function(dx,dy)
 {
	this.xTra+=2.0*dx/this.zoom;
	this.yTra-=2.0*dy/this.zoom;
	this.view_changed=true;
 }
 
webGLcamera.prototype.rotate=function(dx,dy)
 {
	this.yRot+=360*dx;
	this.xRot+=360*dy;
	this.view_changed=true;
 }
 
webGLcamera.prototype.zooming=function(dx,dy)
 {
	this.zoom*=1.0+dy;
	this.zoom*=1.0+dx;
	if(this.zoom>4) this.zoom=4;
	this.view_changed=true;
 }
 
webGLcamera.prototype.relight=function(dx,dy)
 {
	this.yLig+=3.14*dx;
	this.xLig-=3.14*dy;
	if(this.xLig<-1.57) this.xLig=-1.57;
	else if(this.xLig>1.57) this.xLig=1.57;
	if(this.yLig<-1.57) this.yLig=-1.57;
	else if(this.yLig>1.57) this.yLig=1.57;
	this.light_changed=true;
}

webGLcamera.prototype.updatemvMatrix=function()
{
	mat4.identity(this.mvMatrix);
	mat4.translate(this.mvMatrix, [0.0, 0.0, -2]);
	mat4.scale(this.mvMatrix, [this.zoom, this.zoom, this.zoom]);
	mat4.rotate(this.mvMatrix, this.yRot* Math.PI / 180, [0, 1, 0]);
	mat4.rotate(this.mvMatrix, this.xRot* Math.PI / 180, [1, 0, 0]);
	mat4.translate(this.mvMatrix, [this.xTra, this.yTra, 0.0]);
}

webGLcamera.prototype.getLightingDirection=function()
{
	return [Math.sin(this.yLig)*Math.cos(this.xLig), Math.sin(this.xLig), Math.cos(this.yLig)*Math.cos(this.xLig) ];
}

webGLcamera.prototype.animate=function()
{
	if(this.animation_frames==0)
	{
		this.anim_zoom0=this.anim_zoom1;
		this.anim_rotx0=this.anim_rotx1;
		this.anim_roty0=this.anim_roty1;
		this.anim_zoom1=this.anim_zoom2;
		this.anim_rotx1=this.anim_rotx2;
		this.anim_roty1=this.anim_roty2;
		
		this.anim_zoom2=Math.random()*23+2;
		this.anim_rotx2=-Math.random()*70;
		this.anim_roty2=-Math.random()*180+90;
		
		
		if(this.anim_zoom2>-Math.sin(this.anim_rotx2/90)*85*0.7+14) this.anim_zoom2=-Math.sin(this.anim_rotx2/90)*85*0.7+14;
		if(this.anim_zoom2>25)this.anim_zoom2=25;
		if(this.anim_zoom2<2)this.anim_zoom2=2;
		
		this.animation_frames=this.total_animation_frames;
	}
	else if(this.animation_frames>0)
	{
		var w=this.animation_frames/this.total_animation_frames;
		this.animation_frames-=1;
		
		this.zoom+=(w*(this.anim_zoom1-this.anim_zoom0)+(1-w)*(this.anim_zoom2-this.anim_zoom1))/this.total_animation_frames;
		this.rot_x+=(w*(this.anim_rotx1-this.anim_rotx0)+(1-w)*(this.anim_rotx2-this.anim_rotx1))/this.total_animation_frames;
		this.rot_y+=(w*(this.anim_roty1-this.anim_roty0)+(1-w)*(this.anim_roty2-this.anim_roty1))/this.total_animation_frames;
		
		if(this.rot_x>0)this.rot_x=0;
		else if(this.rot_x<-25)this.rot_x=-25;
		
		if(this.rot_y>45)this.rot_y=45;
		else if(this.rot_y<-45)this.rot_y=-45;
		
		if(this.zoom>-Math.sin(this.rot_x/90)*85*0.7+14) this.zoom=-Math.sin(this.rot_x/90)*85*0.7+14;
		if(this.zoom>12)this.zoom=12;
		if(this.zoom<8)this.zoom=8;		
	}
	
	
    mat4.identity(mvMatrix);
	mat4.rotate(mvMatrix, 3.1416, [0, 1, 0]);
	mat4.translate(mvMatrix, [0.0, 0.0, this.zoom]);
	mat4.scale(mvMatrix, [this.scale, this.scale, this.scale]);
	mat4.rotate(mvMatrix, degToRad(this.rot_x), [1, 0, 0]);
	mat4.rotate(mvMatrix, degToRad(this.rot_y), [0, 1, 0]);
	mat4.translate(mvMatrix, [this.tra_x, this.tra_y, 0.0]);
	mat4.rotate(mvMatrix, -3.1416, [0, 1, 0]);
}

